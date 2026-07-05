import React from 'react'
import useStore from '../store/store'

export default function SettingsView() {
  const { theme, toggleTheme, editorFontSize, editorLineHeight, dailyNotesFolder, setEditorFontSize, setEditorLineHeight, setDailyNotesFolder } = useStore()

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Theme</div>
            <div className="settings-desc">Switch between dark and light mode</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Editor</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Font size</div>
            <div className="settings-desc">Editor and UI font size</div>
          </div>
          <select className="settings-select" value={editorFontSize} onChange={(e) => setEditorFontSize(Number(e.target.value))}>
            <option value={12}>12px</option>
            <option value={13}>13px</option>
            <option value={14}>14px</option>
            <option value={15}>15px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Line height</div>
            <div className="settings-desc">Spacing between lines</div>
          </div>
          <select className="settings-select" value={editorLineHeight} onChange={(e) => setEditorLineHeight(Number(e.target.value))}>
            <option value={1.4}>1.4</option>
            <option value={1.6}>1.6</option>
            <option value={1.7}>1.7</option>
            <option value={2.0}>2.0</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>Files & Links</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Daily notes folder</div>
            <div className="settings-desc">Folder for daily notes</div>
          </div>
          <select className="settings-select" value={dailyNotesFolder} onChange={(e) => setDailyNotesFolder(e.target.value)}>
            <option value="/">Root</option>
            <option value="Daily">Daily</option>
            <option value="Journal">Journal</option>
            <option value="Daily Notes">Daily Notes</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Granite</div>
            <div className="settings-desc">Version 1.0.0 — Local-first Markdown knowledge management</div>
          </div>
        </div>
      </div>
    </div>
  )
}
