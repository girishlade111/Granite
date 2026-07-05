import React, { useState, useMemo, useCallback } from 'react'
import { X, Eye, Edit3 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import useStore from '../store/store'
import MarkdownEditor from '../editor/MarkdownEditor'
import FrontmatterEditor from '../editor/FrontmatterEditor'
import { pluginEngine } from '../plugins/PluginEngine'

export default function EditorPane() {
  const { openFiles, activeFileId, closeFile, setActiveFile } = useStore()
  const activeFile = useMemo(
    () => openFiles.find((f) => f.path === activeFileId),
    [openFiles, activeFileId]
  )

  if (openFiles.length === 0) {
    return (
      <div className="editor-pane editor-empty">
        <div className="editor-empty-content">
          <h2>No file open</h2>
          <p>Select a file from the sidebar or press Cmd+P to search</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-pane">
      <div className="editor-tabs">
        {openFiles.map((file, idx) => (
          <div
            key={file.path}
            className={`editor-tab ${file.path === activeFileId ? 'editor-tab-active' : ''}`}
            onClick={() => setActiveFile(file.path)}
            onMouseDown={(e) => {
              if (e.button === 1) closeFile(file.path)
            }}
          >
            <span className="tab-name">{file.name}</span>
            {file.isDirty && <span className="tab-dirty" />}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation()
                closeFile(file.path)
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="editor-content">
        {activeFile && (
          <FileEditor key={activeFile.path} file={activeFile} />
        )}
      </div>
    </div>
  )
}

function FileEditor({ file }) {
  const { updateFileContent, saveFile, linkIndex, openFile } = useStore()
  const [mode, setMode] = useState('edit')

  const handleChange = (content) => {
    updateFileContent(file.path, content)
  }

  const handleSave = () => {
    saveFile(file.path)
  }

  const hasMetadata = file.metadata && Object.keys(file.metadata).length > 0

  const renderedContent = useMemo(() => {
    if (mode !== 'preview') return ''
    let body = file.body || ''
    body = body
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2]($1)')
      .replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
        const noteMap = linkIndex?.noteMap || {}
        const resolved = noteMap[name.trim().toLowerCase()]
        if (resolved) return `[${name.trim()}](${resolved})`
        return name.trim()
      })
    pluginEngine.hooks.onMarkdownRender.forEach((fn) => {
      const result = fn(body, file.path)
      if (typeof result === 'string') body = result
    })
    return body
  }, [file, mode, linkIndex])

  const handlePreviewClick = useCallback((e) => {
    const anchor = e.target.closest('a')
    if (!anchor || !anchor.getAttribute('href')) return
    const href = anchor.getAttribute('href')
    if (href.startsWith('http')) {
      window.electronAPI?.openExternal?.(href)
      return
    }
    const noteMap = linkIndex?.noteMap || {}
    const resolved = noteMap[href.trim().toLowerCase()]
    if (resolved) openFile(resolved)
  }, [linkIndex, openFile])

  return (
    <div className="file-editor">
      <div className="editor-mode-bar">
        <button
          className={`editor-mode-btn ${mode === 'edit' ? 'active' : ''}`}
          onClick={() => setMode('edit')}
        >
          <Edit3 size={14} /> Edit
        </button>
        <button
          className={`editor-mode-btn ${mode === 'preview' ? 'active' : ''}`}
          onClick={() => setMode('preview')}
        >
          <Eye size={14} /> Preview
        </button>
      </div>
      {mode === 'edit' && hasMetadata && (
        <FrontmatterEditor filePath={file.path} metadata={file.metadata} />
      )}
      {mode === 'edit' ? (
        <MarkdownEditor
          content={file.body}
          onChange={handleChange}
          onSave={handleSave}
        />
      ) : (
        <div className="markdown-preview" onClick={handlePreviewClick}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {renderedContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
