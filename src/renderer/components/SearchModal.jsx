import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, File, Command } from 'lucide-react'
import useStore from '../store/store'
import { searchFiles, searchCommands, COMMAND_PALETTE_COMMANDS } from '../engine/searchEngine'

export default function SearchModal() {
  const {
    linkIndex,
    toggleSearch,
    openFile,
    toggleGraph,
    toggleTheme,
    toggleSidebar,
    toggleRightSidebar,
    createNewNote,
  } = useStore()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const notes = useMemo(() => linkIndex.allNotes || [], [linkIndex])

  const results = useMemo(() => {
    if (!query) return { files: notes.slice(0, 20), commands: COMMAND_PALETTE_COMMANDS }
    const matchedFiles = searchFiles(notes, query)
    const matchedCommands = searchCommands(COMMAND_PALETTE_COMMANDS, query)
    return {
      files: matchedFiles.slice(0, 10),
      commands: matchedCommands.slice(0, 5),
    }
  }, [query, notes])

  const allResults = useMemo(() => {
    return [
      ...results.files.map((f) => ({ type: 'file', data: f })),
      ...results.commands.map((c) => ({ type: 'command', data: c })),
    ]
  }, [results])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleSelect = useCallback((item) => {
    if (item.type === 'file') {
      openFile(item.data.path)
      toggleSearch()
    } else if (item.type === 'command') {
      toggleSearch()
      const cmd = item.data
      switch (cmd.id) {
        case 'graph':
          toggleGraph()
          break
        case 'theme':
          toggleTheme()
          break
        case 'toggle-sidebar':
          toggleSidebar()
          break
        case 'toggle-right':
          toggleRightSidebar()
          break
        case 'new-note':
          createNewNote()
          break
        default:
          break
      }
    }
  }, [openFile, toggleSearch, toggleGraph, toggleTheme, toggleSidebar, toggleRightSidebar, createNewNote])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allResults[activeIndex]) handleSelect(allResults[activeIndex])
    } else if (e.key === 'Escape') {
      toggleSearch()
    }
  }

  return (
    <div className="modal-overlay" onClick={toggleSearch}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search files and commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="search-results">
          {allResults.length === 0 && (
            <div className="search-empty">No results</div>
          )}
          {allResults.map((item, i) => (
            <div
              key={`${item.type}-${item.data.id || item.data.path}`}
              className={`search-result-item ${i === activeIndex ? 'search-result-active' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="search-result-icon">
                {item.type === 'file' ? <File size={14} /> : <Command size={14} />}
              </span>
              <span className="search-result-text">
                {item.type === 'file' ? item.data.name : item.data.name}
              </span>
              {item.type === 'command' && item.data.shortcut && (
                <span className="search-result-shortcut">{item.data.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
