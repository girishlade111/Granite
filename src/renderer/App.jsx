import React, { useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import useStore from './store/store'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import EditorPane from './components/EditorPane'
import RightSidebar from './components/RightSidebar'
import ShortcutsHelp from './components/ShortcutsHelp'
import HoverPreview, { useHoverPreview } from './components/HoverPreview'
import { ensureDailyNote } from './engine/DailyNotes'
import { pluginEngine } from './plugins/PluginEngine'

const GraphView = lazy(() => import('./components/GraphView'))
const SearchModal = lazy(() => import('./components/SearchModal'))
const CanvasView = lazy(() => import('./components/CanvasView'))

async function loadPlugins(vaultPath) {
  if (!window.electronAPI?.readFile || !window.electronAPI?.getTree) return
  try {
    const candidates = [`${vaultPath}/plugins`, `${vaultPath}/.obsidian/plugins`]
    for (const dir of candidates) {
      const tree = await window.electronAPI.getTree(dir)
      if (!tree) continue
      for (const item of tree) {
        if (item.type !== 'directory') continue
        const manifestStr = await window.electronAPI.readFile(`${dir}/${item.name}/manifest.json`)
        if (!manifestStr?.content) continue
        const manifest = JSON.parse(manifestStr.content)
        const scriptResult = await window.electronAPI.readFile(`${dir}/${item.name}/main.js`)
        if (!scriptResult?.content) continue
        await pluginEngine.loadPlugin(manifest, scriptResult.content)
      }
    }
  } catch (e) {
    console.error('loadPlugins failed:', e)
  }
}

export default function App() {
  const {
    vaultPath,
    sidebarOpen,
    rightSidebarOpen,
    graphOpen,
    canvasOpen,
    searchOpen,
    helpOpen,
    theme,
    editorFontSize,
    editorLineHeight,
    activeFileId,
    dailyNotesFolder,
    openFolder,
    openFile,
  } = useStore()

  const dailyOpenedRef = useRef(false)
  const { hoverState: hoverPreview, setHoverState: setHoverPreview } = useHoverPreview()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.setProperty('--editor-font-size', `${editorFontSize}px`)
    root.style.setProperty('--editor-line-height', String(editorLineHeight))
  }, [theme, editorFontSize, editorLineHeight])

  useEffect(() => {
    useStore.getState().loadSettings()
  }, [])

  const handleKeyDown = useCallback((e) => {
    const mod = e.metaKey || e.ctrlKey

    if (mod && e.key === 'p') {
      e.preventDefault()
      useStore.getState().toggleSearch()
    }
    if (mod && e.key === '\\' && !e.shiftKey) {
      e.preventDefault()
      useStore.getState().toggleSidebar()
    }
    if (mod && e.key === '\\' && e.shiftKey) {
      e.preventDefault()
      useStore.getState().toggleRightSidebar()
    }
    if (mod && e.key === 'g' && e.shiftKey) {
      e.preventDefault()
      useStore.getState().toggleGraph()
    }
    if (mod && e.key === 'c' && e.shiftKey) {
      e.preventDefault()
      useStore.getState().toggleCanvas()
    }
    if (mod && e.key === 't' && e.shiftKey) {
      e.preventDefault()
      useStore.getState().toggleTheme()
    }
    if (mod && e.key === 's') {
      e.preventDefault()
      const activeId = useStore.getState().activeFileId
      if (activeId) useStore.getState().saveFile(activeId)
    }
    if (mod && e.key === 'n' && !e.shiftKey) {
      e.preventDefault()
      useStore.getState().createNewNote()
    }
    if (mod && e.key === 'n' && e.shiftKey) {
      e.preventDefault()
      useStore.getState().createNewFolder()
    }
    if (mod && e.key === 'o') {
      e.preventDefault()
      useStore.getState().openFolder()
    }
    if (mod && e.key === 'w') {
      e.preventDefault()
      const state = useStore.getState()
      if (state.activeFileId) state.closeFile(state.activeFileId)
    }
    if (!mod && e.key === '?') {
      e.preventDefault()
      useStore.getState().toggleHelp()
    }
  }, [])

  useEffect(() => {
    if (!vaultPath) {
      window.electronAPI?.getSavedVaultPath().then((savedPath) => {
        if (savedPath) {
          useStore.getState().openFolderByPath(savedPath)
        } else {
          openFolder()
        }
      })
    }
  }, [vaultPath, openFolder])

  // Plugin loading
  useEffect(() => {
    if (!vaultPath) return
    loadPlugins(vaultPath)
  }, [vaultPath])

  useEffect(() => {
    if (!vaultPath) return
    if (dailyOpenedRef.current === vaultPath) return
    dailyOpenedRef.current = vaultPath
    ensureDailyNote(vaultPath, dailyNotesFolder).then((path) => {
      if (path) openFile(path)
    }).catch(() => {
      // daily note creation failed silently
    })
  }, [vaultPath, dailyNotesFolder, openFile])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // File watcher listener
  useEffect(() => {
    const unsubCreated = window.electronAPI?.onFileCreated?.((data) => {
      useStore.getState().refreshTree()
      useStore.getState().refreshIndex()
    })
    const unsubChanged = window.electronAPI?.onFileChanged?.((data) => {
      useStore.getState().refreshTree()
      useStore.getState().refreshIndex()
    })
    const unsubDeleted = window.electronAPI?.onFileDeleted?.(() => {
      useStore.getState().refreshTree()
      useStore.getState().refreshIndex()
    })
    return () => {
      unsubCreated?.()
      unsubChanged?.()
      unsubDeleted?.()
    }
  }, [])

  // Menu IPC handlers
  useEffect(() => {
    if (!window.electronAPI) return
    const unsubscribers = [
      window.electronAPI.onMenuNewNote?.(() => useStore.getState().createNewNote()),
      window.electronAPI.onMenuNewFolder?.(() => useStore.getState().createNewFolder()),
      window.electronAPI.onMenuOpenFolder?.(() => openFolder()),
      window.electronAPI.onMenuSave?.(() => {
        const activeId = useStore.getState().activeFileId
        if (activeId) useStore.getState().saveFile(activeId)
      }),
      window.electronAPI.onMenuToggleSidebar?.(() => useStore.getState().toggleSidebar()),
      window.electronAPI.onMenuToggleRightSidebar?.(() => useStore.getState().toggleRightSidebar()),
      window.electronAPI.onMenuToggleGraph?.(() => useStore.getState().toggleGraph()),
      window.electronAPI.onMenuToggleCanvas?.(() => useStore.getState().toggleCanvas()),
      window.electronAPI.onMenuToggleTheme?.(() => useStore.getState().toggleTheme()),
      window.electronAPI.onMenuShowHelp?.(() => useStore.getState().toggleHelp()),
    ]
    return () => unsubscribers.forEach((u) => u?.())
  }, [openFolder])

  if (!vaultPath) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <h1>Granite</h1>
          <p>Local-first Markdown knowledge management</p>
          <button className="btn-primary" onClick={openFolder}>
            Open Folder as Vault
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-body">
        {sidebarOpen && <Sidebar />}
        <EditorPane />
        {rightSidebarOpen && <RightSidebar />}
      </div>
      {graphOpen && <Suspense fallback={null}><GraphView /></Suspense>}
      {canvasOpen && <Suspense fallback={null}><CanvasView /></Suspense>}
      {searchOpen && <Suspense fallback={null}><SearchModal /></Suspense>}
      {helpOpen && <ShortcutsHelp onClose={() => useStore.getState().toggleHelp()} />}
      {hoverPreview && (
        <HoverPreview
          linkText={hoverPreview.linkText}
          position={hoverPreview.position}
        />
      )}
    </div>
  )
}
