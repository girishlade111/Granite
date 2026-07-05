import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import useStore from '../store/store'

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export default function HoverPreview({ linkText, position }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const previewRef = useRef(null)
  const cancelledRef = useRef(false)

  const { linkIndex } = useStore()

  useEffect(() => {
    cancelledRef.current = false
    async function fetchPreview() {
      setLoading(true)
      setError(null)

      const target = linkText.split('|')[0].trim()
      const noteMap = linkIndex.noteMap || {}
      const resolvedPath = noteMap[target.toLowerCase()]

      if (!resolvedPath) {
        setError('Note not found')
        setLoading(false)
        return
      }

      try {
        if (!window.electronAPI?.readFile) { setLoading(false); return }
        const result = await window.electronAPI.readFile(resolvedPath)
        if (cancelledRef.current) return
        if (result?.content) {
          const body = result.content.replace(/^---[\s\S]*?---\n?/, '').trim()
          setContent(body.substring(0, 2000))
        } else {
          setError('Empty note')
        }
      } catch {
        setError('Failed to load')
      }
      setLoading(false)
    }

    fetchPreview()
    return () => { cancelledRef.current = true }
  }, [linkText, linkIndex])

  const style = {
    left: Math.min(position.x, window.innerWidth - 360),
    top: Math.min(position.y, window.innerHeight - 300),
  }

  return (
    <div className="hover-preview" ref={previewRef} style={style}>
      {loading && <div className="hover-preview-loading">Loading...</div>}
      {error && <div className="hover-preview-error">{error}</div>}
      {content && (
        <div className="hover-preview-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
              a: ({ href, children }) => (
                <a href={href} onClick={(e) => e.preventDefault()}>
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function useHoverPreview() {
  const [hoverState, setHoverState] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleMouseOver = useCallback((e, text) => {
    const match = text && text.match(WIKI_LINK_REGEX)
    if (!match) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const rect = e.target.getBoundingClientRect()
      setHoverState({
        linkText: match[0].replace(/^\[\[/, '').replace(/\]\]$/, ''),
        position: { x: rect.right + 8, y: rect.top },
      })
    }, 600)
  }, [])

  const handleMouseOut = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHoverState(null)
  }, [])

  return { hoverState, handleMouseOver, handleMouseOut, setHoverState }
}
