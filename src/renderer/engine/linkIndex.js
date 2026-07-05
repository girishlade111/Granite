const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const tagRegex = /(?:^|\s)(#[^\s#!@$%^&*()=+[\]{}|;:'",.<>/?`~]+)/g
const embedRegex = /!\[\[([^\]]+)\]\]/g

export function extractLinks(content, filePath) {
  const links = []
  const embeds = []
  const tags = []
  const linkSet = new Set()

  let match
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const target = match[1].trim()
    const alias = match[2]?.trim()
    const key = target.toLowerCase()
    if (!linkSet.has(key)) {
      linkSet.add(key)
      links.push({
        type: 'wikilink',
        target,
        alias,
        source: filePath,
        position: match.index,
      })
    }
  }

  while ((match = embedRegex.exec(content)) !== null) {
    embeds.push({
      type: 'embed',
      target: match[1].trim(),
      source: filePath,
      position: match.index,
    })
  }

  while ((match = tagRegex.exec(content)) !== null) {
    tags.push({
      type: 'tag',
      tag: match[1].trim(),
      source: filePath,
      position: match.index,
    })
  }

  return { links, embeds, tags }
}

export async function indexVault(vaultPath) {
  const outgoing = {}
  const incoming = {}
  const allNotes = []

  async function walkTree(tree) {
    for (const entry of tree) {
      if (entry.type === 'directory' && entry.children) {
        await walkTree(entry.children)
      } else if (entry.type === 'file' && entry.ext === '.md') {
        allNotes.push(entry)
        if (!window.electronAPI?.readFile) continue
        const result = await window.electronAPI.readFile?.(entry.path)
        if (result?.content) {
          const { links } = extractLinks(result.content, entry.path)
          outgoing[entry.path] = links

          for (const link of links) {
            const targetKey = link.target.toLowerCase()
            if (!incoming[targetKey]) incoming[targetKey] = []
            incoming[targetKey].push({
              sourcePath: entry.path,
              sourceName: entry.name,
              alias: link.alias,
              position: link.position,
            })
          }
        }
      }
    }
  }

  if (!window.electronAPI?.getTree) return { outgoing: {}, incoming: {}, allNotes: [], noteMap: {}, resolvedOutgoing: {} }
  const tree = await window.electronAPI.getTree?.()
  await walkTree(tree)

  // Build note name to path map
  const noteMap = {}
  for (const note of allNotes) {
    const name = note.name.replace(/\.md$/i, '').toLowerCase()
    noteMap[name] = note.path
  }

  // Resolve links
  const resolvedOutgoing = {}
  for (const [path, links] of Object.entries(outgoing)) {
    resolvedOutgoing[path] = links.map((l) => {
      const targetKey = l.target.toLowerCase()
      const resolvedPath = noteMap[targetKey] || null
      return { ...l, resolvedPath }
    })
  }

  // Build incoming by resolved path
  const resolvedIncoming = {}
  for (const note of allNotes) {
    resolvedIncoming[note.path] = []
  }
  for (const [path, links] of Object.entries(resolvedOutgoing)) {
    for (const link of links) {
      if (link.resolvedPath) {
        if (!resolvedIncoming[link.resolvedPath]) resolvedIncoming[link.resolvedPath] = []
        resolvedIncoming[link.resolvedPath].push({
          sourcePath: path,
          sourceName: path.split(/[\\/]/).pop(),
          alias: link.alias,
          displayText: link.alias || link.target,
        })
      }
    }
  }

  return {
    outgoing: resolvedOutgoing,
    incoming: resolvedIncoming,
    allNotes,
    noteMap,
  }
}

export function resolveWikiLink(linkText, noteMap) {
  const parts = linkText.split('|')
  const target = parts[0].trim()
  const alias = parts[1]?.trim()
  const resolvedPath = noteMap[target.toLowerCase()]
  return { target, alias, resolvedPath }
}
