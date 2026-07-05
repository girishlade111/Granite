import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import useStore from '../store/store'
import { X, Minus, Plus, Link2 } from 'lucide-react'

const NODE_WIDTH = 200
const NODE_HEIGHT = 120

export default function CanvasView() {
  const { canvasNodes, canvasEdges, addCanvasNode, addCanvasEdge, updateCanvasNode, toggleCanvas } = useStore()
  const canvasRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(null)
  const [panning, setPanning] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [connectMode, setConnectMode] = useState(false)

  const toWorld = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - offset.x) / zoom,
      y: (clientY - rect.top - offset.y) / zoom,
    }
  }, [zoom, offset])

  const handleMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
      setPanning({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e) => {
    if (panning) {
      setOffset({ x: e.clientX - panning.x, y: e.clientY - panning.y })
    }
    if (dragging) {
      const world = toWorld(e.clientX, e.clientY)
      const dx = world.x - dragging.startX
      const dy = world.y - dragging.startY
      updateCanvasNode(dragging.id, {
        x: dragging.nodeX + dx,
        y: dragging.nodeY + dy,
      })
    }
    if (connecting) {
      const rect = canvasRef.current.getBoundingClientRect()
      setConnecting((prev) => ({
        ...prev,
        mouseX: (e.clientX - rect.left - offset.x) / zoom,
        mouseY: (e.clientY - rect.top - offset.y) / zoom,
      }))
    }
  }

  const handleMouseUp = () => {
    setPanning(null)
    setDragging(null)
    setConnecting(null)
  }

  const onNodeMouseDown = (e, node) => {
    e.stopPropagation()
    if (connectMode) {
      const world = toWorld(e.clientX, e.clientY)
      setConnecting({ from: node.id, fromX: node.x + NODE_WIDTH / 2, fromY: node.y + NODE_HEIGHT / 2, mouseX: world.x, mouseY: world.y })
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    setDragging({
      id: node.id,
      startX: world.x,
      startY: world.y,
      nodeX: node.x,
      nodeY: node.y,
    })
  }

  const onNodeMouseUp = (e, node) => {
    if (connecting && connecting.from && connecting.from !== node.id) {
      addCanvasEdge({ id: `edge-${Date.now()}`, from: connecting.from, to: node.id })
    }
    if (connecting) setConnecting(null)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(Math.max(z * delta, 0.1), 5))
  }

  const handleDoubleClick = (e) => {
    if (connectMode) return
    const world = toWorld(e.clientX, e.clientY)
    const id = `node-${Date.now()}`
    addCanvasNode({
      id,
      x: world.x - NODE_WIDTH / 2,
      y: world.y - NODE_HEIGHT / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      title: 'New Card',
      content: '',
      type: 'card',
      zIndex: canvasNodes.length,
    })
  }

  const visibleNodes = canvasNodes.filter((n) => {
    const nx = n.x * zoom + offset.x
    const ny = n.y * zoom + offset.y
    const nw = n.width * zoom
    const nh = n.height * zoom
    const vw = canvasRef.current?.clientWidth || 1000
    const vh = canvasRef.current?.clientHeight || 800
    return nx + nw > -100 && nx < vw + 100 && ny + nh > -100 && ny < vh + 100
  })

  const nodePositions = useMemo(() => {
    const map = {}
    for (const n of canvasNodes) {
      map[n.id] = { x: n.x + NODE_WIDTH / 2, y: n.y + NODE_HEIGHT / 2 }
    }
    return map
  }, [canvasNodes])

  const renderedEdges = useMemo(() => {
    return canvasEdges
      .filter((e) => nodePositions[e.from] && nodePositions[e.to])
      .map((e) => ({
        id: e.id,
        x1: nodePositions[e.from].x,
        y1: nodePositions[e.from].y,
        x2: nodePositions[e.to].x,
        y2: nodePositions[e.to].y,
      }))
  }, [canvasEdges, nodePositions])

  return (
    <div className="modal-overlay">
      <div className="canvas-view">
        <div className="canvas-toolbar">
          <button className="titlebar-btn" onClick={() => setZoom((z) => z * 1.2)}>
            <Plus size={16} />
          </button>
          <span className="canvas-zoom">{Math.round(zoom * 100)}%</span>
          <button className="titlebar-btn" onClick={() => setZoom((z) => z * 0.8)}>
            <Minus size={16} />
          </button>
          <button className="titlebar-btn" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}>
            Reset
          </button>
          <button
            className={`titlebar-btn ${connectMode ? 'titlebar-btn-active' : ''}`}
            onClick={() => { setConnectMode((m) => !m); setConnecting(null) }}
            title="Connect nodes"
          >
            <Link2 size={16} />
          </button>
          <button className="titlebar-btn canvas-close" onClick={toggleCanvas}>
            <X size={16} />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="canvas-bg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        />
        <svg
          className="canvas-edges-layer"
          style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {renderedEdges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.x1} y1={edge.y1}
              x2={edge.x2} y2={edge.y2}
              stroke="var(--canvas-edge)"
              strokeWidth={2 / zoom}
              strokeOpacity={0.6}
            />
          ))}
          {connecting && (
            <line
              x1={connecting.fromX} y1={connecting.fromY}
              x2={connecting.mouseX} y2={connecting.mouseY}
              stroke="var(--accent)"
              strokeWidth={2 / zoom}
              strokeDasharray={`${4 / zoom} ${3 / zoom}`}
            />
          )}
        </svg>
        <div
          className="canvas-nodes-layer"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {visibleNodes.map((node) => (
            <div
              key={node.id}
              className={`canvas-node ${connectMode ? 'canvas-node-connect' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: node.zIndex,
              }}
              onMouseDown={(e) => onNodeMouseDown(e, node)}
              onMouseUp={(e) => onNodeMouseUp(e, node)}
            >
              <div className="canvas-node-title">{node.title}</div>
              <div className="canvas-node-content">{node.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
