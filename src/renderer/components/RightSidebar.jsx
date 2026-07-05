import React, { useMemo, useCallback } from 'react'
import { X, ArrowRight, Link2, FileText } from 'lucide-react'
import useStore from '../store/store'

export default function RightSidebar() {
  const { activeFileId, linkIndex, unlinkedMentions, fileContents, openFile, toggleRightSidebar, rightSidebarView, setRightSidebarView, saveFile } = useStore()

  const backlinks = useMemo(() => {
    if (!activeFileId || !linkIndex.incoming) return []
    return linkIndex.incoming[activeFileId] || []
  }, [activeFileId, linkIndex])

  const outgoingLinks = useMemo(() => {
    if (!activeFileId || !linkIndex.outgoing) return []
    return linkIndex.outgoing[activeFileId] || []
  }, [activeFileId, linkIndex])

  const mentions = useMemo(() => {
    if (!activeFileId || !unlinkedMentions) return []
    return unlinkedMentions[activeFileId] || []
  }, [activeFileId, unlinkedMentions])

  const handleAddLink = useCallback(async (m) => {
    const state = useStore.getState()
    const content = state.fileContents[activeFileId]
    if (!content || m.position == null) return
    const linkStr = `[[${m.name}]]`
    const newContent = content.slice(0, m.position) + linkStr + content.slice(m.position)
    try {
      await window.electronAPI?.writeFile?.(activeFileId, newContent)
      state.refreshTree()
      state.refreshIndex()
    } catch (e) {
      console.error('handleAddLink failed:', e)
    }
  }, [activeFileId])

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">
        <span className="right-sidebar-title">Links</span>
        <button className="titlebar-btn" onClick={toggleRightSidebar}>
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${rightSidebarView === 'backlinks' ? 'active' : ''}`}
          onClick={() => setRightSidebarView('backlinks')}
        >
          Backlinks ({backlinks.length})
        </button>
        <button
          className={`sidebar-tab ${rightSidebarView === 'outgoing' ? 'active' : ''}`}
          onClick={() => setRightSidebarView('outgoing')}
        >
          Outgoing ({outgoingLinks.length})
        </button>
      </div>

      <div className="right-sidebar-content">
        {rightSidebarView === 'backlinks' && (
          <div className="backlinks-panel">
            {backlinks.length === 0 && (
              <div className="panel-empty">No backlinks</div>
            )}
            {backlinks.map((link, i) => (
              <div key={i} className="backlink-item" onClick={() => openFile(link.sourcePath)}>
                <div className="backlink-source">
                  <FileText size={12} />
                  <span>{link.sourceName}</span>
                </div>
                <div className="backlink-text">
                  {link.displayText || link.alias || link.sourceName}
                </div>
              </div>
            ))}
            {mentions.length > 0 && (
              <>
                <div className="panel-section-header">Unlinked mentions ({mentions.length})</div>
                {mentions.map((m, i) => (
                  <div key={i} className="backlink-item">
                    <div className="backlink-source">
                      <Link2 size={12} />
                      <span>{m.name}</span>
                    </div>
                    <button className="btn-link" onClick={() => handleAddLink(m)}>Add link</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {rightSidebarView === 'outgoing' && (
          <div className="outgoing-panel">
            {outgoingLinks.length === 0 && (
              <div className="panel-empty">No outgoing links</div>
            )}
            {outgoingLinks.map((link, i) => (
              <div key={i} className="backlink-item">
                <div className="backlink-source">
                  <ArrowRight size={12} />
                  <span>{link.target}{link.alias ? ` | ${link.alias}` : ''}</span>
                </div>
                {link.resolvedPath && (
                  <button className="btn-link" onClick={() => openFile(link.resolvedPath)}>Open</button>
                )}
                {!link.resolvedPath && (
                  <span className="unresolved-badge">Unresolved</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
