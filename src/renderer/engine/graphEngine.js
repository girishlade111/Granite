export function buildGraphData(linkIndex, options = {}) {
  const { depth = Infinity, includeTags = true, includeAttachments = true, includeOrphans = true } = options
  const { outgoing, incoming, allNotes } = linkIndex

  const nodeSet = new Set()
  const edgeSet = new Set()
  const nodeMap = {}

  for (const note of allNotes) {
    nodeMap[note.path] = {
      id: note.path,
      name: note.name,
      label: note.name.replace(/\.md$/i, ''),
      path: note.path,
      type: 'note',
      group: 1,
    }
  }

  for (const [source, links] of Object.entries(outgoing)) {
    if (!nodeMap[source]) continue
    nodeSet.add(source)
    for (const link of links) {
      if (link.resolvedPath) {
        nodeSet.add(source)
        nodeSet.add(link.resolvedPath)
        const edgeKey = `${source}->${link.resolvedPath}`
        edgeSet.add(edgeKey)
      }
    }
  }

  if (!includeOrphans) {
    const connected = new Set()
    for (const edge of edgeSet) {
      const [s, t] = edge.split('->')
      connected.add(s)
      connected.add(t)
    }
    const filtered = new Set()
    for (const id of nodeSet) {
      if (connected.has(id)) filtered.add(id)
    }
    nodeSet.clear()
    for (const id of filtered) nodeSet.add(id)
  }

  const nodes = Array.from(nodeSet).map((id) => ({ ...nodeMap[id] }))
  const edges = Array.from(edgeSet).map((key) => {
    const [source, target] = key.split('->')
    return { source, target, id: key }
  })

  return { nodes, edges }
}

export function localGraphData(linkIndex, centerPath, depth = 2) {
  const { outgoing, incoming } = linkIndex
  const visited = new Set()
  const nodeSet = new Set()
  const edgeSet = new Set()
  const queue = [{ path: centerPath, dist: 0 }]
  visited.add(centerPath)

  while (queue.length > 0) {
    const { path, dist } = queue.shift()
    nodeSet.add(path)
    if (dist >= depth) continue

    const outLinks = outgoing[path] || []
    for (const link of outLinks) {
      if (link.resolvedPath && !visited.has(link.resolvedPath)) {
        visited.add(link.resolvedPath)
        queue.push({ path: link.resolvedPath, dist: dist + 1 })
      }
      if (link.resolvedPath) {
        edgeSet.add(`${path}->${link.resolvedPath}`)
      }
    }

    const inLinks = incoming[path] || []
    for (const link of inLinks) {
      if (!visited.has(link.sourcePath)) {
        visited.add(link.sourcePath)
        queue.push({ path: link.sourcePath, dist: dist + 1 })
      }
      edgeSet.add(`${link.sourcePath}->${path}`)
    }
  }

  const nodes = Array.from(nodeSet).map((id) => ({
    id,
    name: id.split(/[\\/]/).pop(),
    label: id.split(/[\\/]/).pop().replace(/\.md$/i, ''),
    path: id,
    type: 'note',
    group: id === centerPath ? 0 : 1,
  }))

  const edges = Array.from(edgeSet).map((key) => {
    const [source, target] = key.split('->')
    return { source, target, id: key }
  })

  return { nodes, edges, centerPath }
}

export function filterGraphData(data, query) {
  if (!query) return data
  const q = query.toLowerCase()
  const filteredNodes = data.nodes.filter(
    (n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)
  )
  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = data.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  )
  return { ...data, nodes: filteredNodes, edges: filteredEdges }
}
