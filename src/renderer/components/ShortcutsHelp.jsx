import React from 'react'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'Cmd+P', desc: 'Search files' },
  { keys: 'Cmd+N', desc: 'New note' },
  { keys: 'Cmd+Shift+N', desc: 'New folder' },
  { keys: 'Cmd+O', desc: 'Open folder as vault' },
  { keys: 'Cmd+S', desc: 'Save file' },
  { keys: 'Cmd+W', desc: 'Close file tab' },
  { keys: 'Cmd+\\', desc: 'Toggle sidebar' },
  { keys: 'Cmd+Shift+\\', desc: 'Toggle right sidebar' },
  { keys: 'Cmd+Shift+G', desc: 'Toggle graph view' },
  { keys: 'Cmd+Shift+C', desc: 'Toggle canvas' },
  { keys: 'Cmd+Shift+T', desc: 'Toggle theme' },
  { keys: '?', desc: 'Show this help' },
]

export default function ShortcutsHelp({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-help" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="titlebar-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="shortcuts-help-list">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="shortcuts-help-row">
              <span className="shortcuts-help-keys">
                {keys.split('+').map((k, i) => (
                  <React.Fragment key={k}>
                    {i > 0 && <span className="shortcut-plus">+</span>}
                    <kbd className="shortcut-kbd">{k}</kbd>
                  </React.Fragment>
                ))}
              </span>
              <span className="shortcuts-help-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
