import React, { useState, useEffect } from 'react'
import { Search, PanelLeft, PanelRight, Share2, Moon, Sun, LayoutGrid, Minus, Square, X } from 'lucide-react'
import useStore from '../store/store'

export default function TitleBar() {
  const {
    vaultPath,
    sidebarOpen,
    rightSidebarOpen,
    theme,
    activeFileId,
    openFiles,
    toggleSidebar,
    toggleRightSidebar,
    toggleGraph,
    toggleCanvas,
    toggleSearch,
    toggleTheme,
    saveFile,
  } = useStore()

  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMaximized)
    const unsub = window.electronAPI?.onMaximizedChanged(setIsMaximized)
    return unsub
  }, [])

  const activeFile = openFiles.find((f) => f.path === activeFileId)
  const vaultName = vaultPath ? vaultPath.split(/[\\/]/).pop() : ''

  return (
      <div className="titlebar" onDoubleClick={() => window.electronAPI?.maximize()} style={{ cursor: 'default' }}>
      <div className="titlebar-left">
        <button className="titlebar-btn" onClick={toggleSidebar} title="Toggle sidebar">
          <PanelLeft size={16} />
        </button>
        <span className="titlebar-path">{vaultName}</span>
        {activeFile && (
          <>
            <span className="titlebar-sep">—</span>
            <span className="titlebar-file">
              {activeFile.name}
              {activeFile.isDirty && <span className="dirty-indicator"> •</span>}
            </span>
          </>
        )}
      </div>
      <div className="titlebar-center">
        <button className="titlebar-btn" onClick={toggleSearch} title="Search (Cmd+P)">
          <Search size={16} />
        </button>
        <button className="titlebar-btn" onClick={toggleCanvas} title="Canvas">
          <LayoutGrid size={16} />
        </button>
        <button className="titlebar-btn" onClick={toggleGraph} title="Graph view (Cmd+Shift+G)">
          <Share2 size={16} />
        </button>
        <button className="titlebar-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <div className="titlebar-right">
        {activeFile?.isDirty && (
          <button className="titlebar-btn save-btn" onClick={() => saveFile(activeFileId)} title="Save">
            Save
          </button>
        )}
        <button className="titlebar-btn" onClick={toggleRightSidebar} title="Toggle right sidebar">
          <PanelRight size={16} />
        </button>
        <div className="window-controls">
          <button className="titlebar-btn win-btn" onClick={() => window.electronAPI?.minimize()} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn win-btn" onClick={() => window.electronAPI?.maximize()} title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? <Square size={12} /> : <Square size={12} />}
          </button>
          <button className="titlebar-btn win-btn win-close" onClick={() => window.electronAPI?.close()} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
