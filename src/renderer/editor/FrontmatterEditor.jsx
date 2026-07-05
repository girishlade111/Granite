import React, { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import useStore from '../store/store'

export default function FrontmatterEditor({ filePath, metadata }) {
  const { updateMetadata, saveFile } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const entries = Object.entries(metadata || {})

  const handleChange = (key, value) => {
    const updated = { ...metadata, [key]: value }
    if (value === '' || value === null || value === undefined) {
      delete updated[key]
    }
    updateMetadata(filePath, updated)
  }

  const handleAdd = () => {
    if (!newKey.trim()) return
    const updated = { ...metadata, [newKey.trim()]: newValue.trim() }
    updateMetadata(filePath, updated)
    setNewKey('')
    setNewValue('')
    setAdding(false)
  }

  const handleRemove = (key) => {
    const updated = { ...metadata }
    delete updated[key]
    updateMetadata(filePath, updated)
  }

  if (entries.length === 0 && !adding) return null

  return (
    <div className="frontmatter-editor">
      <div className="frontmatter-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="frontmatter-title">Properties</span>
        <button className="frontmatter-toggle">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {!collapsed && (
        <div className="frontmatter-body">
          {entries.map(([key, value]) => (
            <div className="frontmatter-row" key={key}>
              <input
                className="frontmatter-key"
                value={key}
                onChange={(e) => {
                  const val = metadata[key]
                  const updated = { ...metadata }
                  delete updated[key]
                  updated[e.target.value] = val
                  updateMetadata(filePath, updated)
                }}
              />
              <input
                className="frontmatter-value"
                value={String(value || '')}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              <button className="frontmatter-remove" onClick={() => handleRemove(key)}>
                <X size={12} />
              </button>
            </div>
          ))}
          {adding && (
            <div className="frontmatter-row">
              <input
                className="frontmatter-key"
                placeholder="Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <input
                className="frontmatter-value"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          )}
          {!adding && (
            <button className="frontmatter-add" onClick={() => setAdding(true)}>
              <Plus size={12} /> Add property
            </button>
          )}
        </div>
      )}
    </div>
  )
}
