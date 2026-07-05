import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2, Pencil } from 'lucide-react'
import useStore from '../store/store'

const TreeItem = React.memo(function TreeItem({ item, depth = 0, onContextMenu }) {
  const { openFile, vaultPath, activeFileId, expandedFolders, toggleFolder } = useStore()
  const isExpanded = expandedFolders.has(item.path)
  const isActive = item.path === activeFileId
  const isDir = item.type === 'directory'
  const indent = depth * 16

  const handleClick = () => {
    if (isDir) {
      toggleFolder(item.path)
    } else {
      openFile(item.path)
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, item)
  }

  return (
    <>
      <div
        className={`tree-item ${isActive ? 'tree-item-active' : ''}`}
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isDir ? (
          <>
            <span className="tree-chevron">
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            {isExpanded ? <FolderOpen size={16} className="tree-icon-folder" /> : <Folder size={16} className="tree-icon-folder" />}
          </>
        ) : (
          <>
            <span className="tree-chevron" style={{ visibility: 'hidden' }}>
              <ChevronRight size={12} />
            </span>
            <File size={16} className="tree-icon-file" />
          </>
        )}
        <span className="tree-label">{item.name}</span>
      </div>
      {isDir && isExpanded && item.children?.map((child) => (
        <TreeItem key={child.path} item={child} depth={depth + 1} onContextMenu={onContextMenu} />
      ))}
    </>
  )
})

export default function Sidebar() {
  const { vaultTree, vaultPath, sidebarWidth, createNewNote, refreshTree } = useStore()
  const [filter, setFilter] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const contextRef = useRef(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const filteredTree = useMemo(() => {
    if (!filter) return vaultTree

    function filterTree(items) {
      return items
        .map((item) => {
          if (item.type === 'directory') {
            const children = filterTree(item.children || [])
            if (children.length > 0 || item.name.toLowerCase().includes(filter.toLowerCase()))
              return { ...item, children }
            return null
          }
          if (item.name.toLowerCase().includes(filter.toLowerCase())) return item
          return null
        })
        .filter(Boolean)
    }
    return filterTree(vaultTree)
  }, [vaultTree, filter])

  const handleContextMenu = (e, item) => {
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleDelete = async () => {
    if (!contextMenu) return
    const { item } = contextMenu
    try {
      if (item.type === 'directory') {
        await window.electronAPI?.deleteDir?.(item.path)
      } else {
        await useStore.getState().deleteFile(item.path)
      }
    } catch (e) {
      console.error('handleDelete failed:', e)
    }
    setContextMenu(null)
  }

  const handleRename = async () => {
    if (!contextMenu) return
    const { item } = contextMenu
    const newName = prompt('New name:', item.name)
    if (!newName || newName === item.name) { setContextMenu(null); return }
    try {
      if (item.type === 'directory') {
        const parts = item.path.split(/[\\/]/)
        parts[parts.length - 1] = newName
        const newPath = parts.join('/')
        await window.electronAPI?.renameFile?.(item.path, newPath)
        refreshTree()
      } else {
        await useStore.getState().renameFile(item.path, newName)
      }
    } catch (e) {
      console.error('handleRename failed:', e)
    }
    setContextMenu(null)
  }

  return (
    <div className="sidebar" style={{ width: sidebarWidth }}>
      <div className="sidebar-header">
        <span className="sidebar-title">{vaultPath?.split(/[\\/]/).pop() || 'Vault'}</span>
        <div className="sidebar-header-actions">
          <button className="titlebar-btn" onClick={createNewNote} title="New note">
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="sidebar-search-input"
        />
      </div>
      <div className="sidebar-tree">
        {filteredTree.map((item) => (
          <TreeItem key={item.path} item={item} onContextMenu={handleContextMenu} />
        ))}
        {filteredTree.length === 0 && (
          <div className="sidebar-empty">No files found</div>
        )}
      </div>
      {contextMenu && (
        <div
          ref={contextRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed' }}
        >
          <div className="context-menu-item" onClick={handleRename}>
            <Pencil size={14} /> Rename
          </div>
          <div className="context-menu-item context-menu-danger" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </div>
        </div>
      )}
    </div>
  )
}
