import React, { useEffect, useRef, useState, useMemo } from 'react'
import { X } from 'lucide-react'
import * as d3Force from 'd3-force'
import useStore from '../store/store'
import { buildGraphData, localGraphData, filterGraphData } from '../engine/graphEngine'

export default function GraphView() {
  const linkIndex = useStore((s) => s.linkIndex)
  const activeFileId = useStore((s) => s.activeFileId)
  const toggleGraph = useStore((s) => s.toggleGraph)
  const openFileRef = useRef(useStore.getState().openFile)
  useEffect(() => {
    const unsub = useStore.subscribe((s) => {
      openFileRef.current = s.openFile
    })
    return unsub
  }, [])
  const svgRef = useRef(null)
  const [localMode, setLocalMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [includeOrphans, setIncludeOrphans] = useState(true)
  const simulationRef = useRef(null)

  const graphData = useMemo(() => {
    if (!linkIndex.outgoing) return { nodes: [], edges: [] }
    let data
    if (localMode && activeFileId) {
      data = localGraphData(linkIndex, activeFileId, 2)
    } else {
      data = buildGraphData(linkIndex, { includeOrphans })
    }
    data.nodes = data.nodes.filter(Boolean)
    if (searchQuery) data = filterGraphData(data, searchQuery)
    return data
  }, [linkIndex, activeFileId, localMode, searchQuery, includeOrphans])

  useEffect(() => {
    if (!svgRef.current) return

    if (graphData.nodes.length === 0) {
      const g = svgRef.current.querySelector('g')
      if (g) g.innerHTML = ''
      return
    }

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const svg = svgRef.current
    let group = svg.querySelector('g')
    if (!group) {
      group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      svg.appendChild(group)
    }
    group.innerHTML = ''

    // Cleanup previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    const nodes = graphData.nodes.map((n) => ({ ...n }))
    const edges = graphData.edges.map((e) => ({ ...e }))

    const simulation = d3Force.forceSimulation(nodes)
      .force('link', d3Force.forceLink(edges).id((d) => d.id).distance(100))
      .force('charge', d3Force.forceManyBody().strength(-200))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collision', d3Force.forceCollide().radius(25))

    simulationRef.current = simulation

    // Render edges
    const linkElements = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    linkElements.classList.add('graph-edges')
    group.appendChild(linkElements)

    const linkEls = edges.map(() => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('stroke', 'var(--graph-edge)')
      line.setAttribute('stroke-width', '1.5')
      line.setAttribute('stroke-opacity', '0.5')
      linkElements.appendChild(line)
      return line
    })

    // Render nodes
    const nodeElements = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeElements.classList.add('graph-nodes')
    group.appendChild(nodeElements)

    const nodeEls = nodes.map((d, i) => {
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      nodeGroup.style.cursor = 'pointer'

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      const isCenter = d.path === activeFileId
      circle.setAttribute('r', isCenter ? '8' : '5')
      circle.setAttribute('fill', isCenter ? 'var(--accent)' : 'var(--graph-node)')
      circle.setAttribute('stroke', isCenter ? 'var(--accent)' : 'transparent')
      circle.setAttribute('stroke-width', '2')
      nodeGroup.appendChild(circle)

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.textContent = d.label?.substring(0, 20)
      label.setAttribute('x', '10')
      label.setAttribute('y', '4')
      label.setAttribute('fill', 'var(--text-muted)')
      label.setAttribute('font-size', '11px')
      label.setAttribute('font-family', 'var(--font-ui)')
      nodeGroup.appendChild(label)

      nodeGroup.addEventListener('click', () => openFileRef.current?.(d.path))
      nodeGroup.addEventListener('mouseenter', () => {
        circle.setAttribute('r', isCenter ? '10' : '7')
      })
      nodeGroup.addEventListener('mouseleave', () => {
        circle.setAttribute('r', isCenter ? '8' : '5')
      })

      nodeElements.appendChild(nodeGroup)
      return nodeGroup
    })

    simulation.on('tick', () => {
      linkEls.forEach((line, i) => {
        if (edges[i]) {
          line.setAttribute('x1', edges[i].source.x)
          line.setAttribute('y1', edges[i].source.y)
          line.setAttribute('x2', edges[i].target.x)
          line.setAttribute('y2', edges[i].target.y)
        }
      })
      nodeEls.forEach((nodeEl, i) => {
        if (nodes[i]) {
          nodeEl.setAttribute('transform', `translate(${nodes[i].x},${nodes[i].y})`)
        }
      })
    })

    return () => {
      simulation.stop()
    }
  }, [graphData, activeFileId])

  return (
    <div className="modal-overlay">
      <div className="graph-view">
        <div className="graph-header">
          <h3>Graph View</h3>
          <div className="graph-controls">
            <label className="graph-toggle">
              <input
                type="checkbox"
                checked={localMode}
                onChange={(e) => setLocalMode(e.target.checked)}
              />
              Local graph
            </label>
            <label className="graph-toggle">
              <input
                type="checkbox"
                checked={includeOrphans}
                onChange={(e) => setIncludeOrphans(e.target.checked)}
              />
              Show orphans
            </label>
            <input
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="graph-search"
            />
            <button className="titlebar-btn" onClick={toggleGraph}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="graph-canvas">
          <svg ref={svgRef} className="graph-svg" />
        </div>
      </div>
    </div>
  )
}
