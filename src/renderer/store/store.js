import { create } from 'zustand'
import { indexVault } from '../engine/linkIndex'
import { parseFrontmatter, serializeFrontmatter } from '../engine/frontmatter'
import { pluginEngine } from '../plugins/PluginEngine'

function hasMdFiles(tree) {
  for (const item of tree) {
    if (item.type === 'file' && item.name.endsWith('.md')) return true
    if (item.type === 'directory' && item.children && hasMdFiles(item.children)) return true
  }
  return false
}

const useStore = create((set, get) => ({
  // --- Vault ---
  vaultPath: null,
  vaultTree: [],
  isLoading: false,

  // --- File System ---
  openFiles: [],
  activeFileId: null,
  fileContents: {},

  // --- UI State ---
  sidebarOpen: true,
  sidebarWidth: 260,
  rightSidebarOpen: false,
  rightSidebarView: 'backlinks',
  graphOpen: false,
  canvasOpen: false,
  searchOpen: false,
  helpOpen: false,
  settingsOpen: false,
  searchQuery: '',
  theme: 'dark',
  editorFontSize: 14,
  editorLineHeight: 1.7,
  dailyNotesFolder: 'Daily',

  // --- Link Index ---
  linkIndex: { outgoing: {}, incoming: {}, allNotes: [] },
  unlinkedMentions: {},

  // --- Canvas ---
  canvasNodes: [],
  canvasEdges: [],

  // --- File Tree ---
  expandedFolders: new Set(),

  // --- Actions ---
  setVault: (vaultPath, tree) => {
    set({ vaultPath, vaultTree: tree })
    get().refreshIndex()
    pluginEngine.hooks.onVaultChange.forEach((fn) => fn(vaultPath))
  },

  setVaultTree: (tree) => set({ vaultTree: tree }),

  openFolder: async () => {
    set({ isLoading: true })
    try {
      if (!window.electronAPI?.openFolder) return
      const result = await window.electronAPI.openFolder()
      if (result) {
        const hasMarkdown = result.tree && hasMdFiles(result.tree)
        if (!hasMarkdown) {
          const proceed = window.confirm?.('No .md files found in this folder. Open anyway?')
          if (!proceed) { set({ isLoading: false }); return }
        }
        set({ vaultPath: result.path, vaultTree: result.tree })
        get().refreshIndex()
        pluginEngine.hooks.onVaultChange.forEach((fn) => fn(result.path))
      }
    } finally {
      set({ isLoading: false })
    }
  },

  openFolderByPath: async (savedPath) => {
    set({ isLoading: true })
    try {
      if (!window.electronAPI?.openByPath) return
      const result = await window.electronAPI.openByPath(savedPath)
      if (result) {
        set({ vaultPath: result.path, vaultTree: result.tree })
        get().refreshIndex()
        pluginEngine.hooks.onVaultChange.forEach((fn) => fn(result.path))
      }
    } finally {
      set({ isLoading: false })
    }
  },

  refreshTree: async () => {
    if (!window.electronAPI?.getTree) return
    try {
      const tree = await window.electronAPI.getTree()
      set({ vaultTree: tree })
    } catch (e) {
      console.error('refreshTree failed:', e)
    }
  },

  refreshIndex: async () => {
    const { vaultPath } = get()
    if (!vaultPath) return
    try {
      const index = await indexVault(vaultPath)
      set({ linkIndex: index })
      get().computeUnlinkedMentions()
    } catch (e) {
      console.error('refreshIndex failed:', e)
    }
  },

  computeUnlinkedMentions: () => {
    const { linkIndex, fileContents } = get()
    if (!linkIndex?.allNotes) return
    const mentions = {}
    const noteNames = linkIndex.allNotes.map((n) => (n.name || '').replace(/\.md$/i, ''))

    for (const note of linkIndex.allNotes) {
      const content = fileContents[note?.path] || ''
      if (!content) continue
      const outgoingLinks = linkIndex.outgoing?.[note.path] || []
      const linkedTitles = new Set(
        outgoingLinks.map((l) => l?.target?.toLowerCase()).filter(Boolean)
      )

      const noteName = (note.name || '').replace(/\.md$/i, '').toLowerCase()
      const found = []
      for (const name of noteNames) {
        if (!name) continue
        if (name.toLowerCase() === noteName) continue
        if (linkedTitles.has(name.toLowerCase())) continue
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
        let match
        while ((match = regex.exec(content)) !== null) {
          found.push({ name, position: match.index })
        }
      }
      if (found.length > 0) mentions[note.path] = found
    }
    set({ unlinkedMentions: mentions })
  },

  // --- File Operations ---
  openFile: async (filePath) => {
    const { openFiles, settingsOpen } = get()
    if (settingsOpen) set({ settingsOpen: false })
    if (openFiles.find((f) => f.path === filePath)) {
      set({ activeFileId: filePath })
      return
    }

    if (!window.electronAPI?.readFile) return
    let result
    try {
      result = await window.electronAPI.readFile(filePath)
    } catch {
      return
    }
    if (!result?.content) return
    const { metadata, body } = parseFrontmatter(result.content)

    const newFile = {
      path: filePath,
      name: filePath.split(/[\\/]/).pop(),
      content: result.content,
      body,
      metadata,
      isDirty: false,
      mtimeMs: result.mtimeMs,
    }

    set({
      openFiles: [...openFiles, newFile],
      activeFileId: filePath,
      fileContents: { ...get().fileContents, [filePath]: result.content },
    })

    pluginEngine.hooks.onFileOpen.forEach((fn) => fn(filePath))
  },

  closeFile: (filePath) => {
    const { openFiles, activeFileId, fileContents } = get()
    const remaining = openFiles.filter((f) => f.path !== filePath)
    let newActive = activeFileId
    if (activeFileId === filePath) {
      const idx = openFiles.findIndex((f) => f.path === filePath)
      newActive = remaining[Math.min(idx, remaining.length - 1)]?.path || null
    }
    const { [filePath]: _, ...restContents } = fileContents
    set({ openFiles: remaining, activeFileId: newActive, fileContents: restContents })
  },

  updateFileContent: (filePath, content) => {
    const { metadata, body } = parseFrontmatter(content)
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === filePath
          ? { ...f, content, body, metadata, isDirty: true }
          : f
      ),
      fileContents: { ...state.fileContents, [filePath]: content },
    }))
    pluginEngine.hooks.onEditorChange.forEach((fn) => fn(filePath, content))
  },

  saveFile: async (filePath) => {
    const { openFiles } = get()
    const file = openFiles.find((f) => f.path === filePath)
    if (!file || !window.electronAPI?.writeFile) return

    let content = file.content
    if (file.metadata && Object.keys(file.metadata).length > 0) {
      content = serializeFrontmatter(file.metadata, file.body)
    }

      try {
        const result = await window.electronAPI.writeFile(filePath, content)
        if (result?.success) {
          set((state) => ({
            openFiles: state.openFiles.map((f) =>
              f.path === filePath ? { ...f, isDirty: false } : f
            ),
          }))
          pluginEngine.hooks.onFileSave.forEach((fn) => fn(filePath, content))
        }
      } catch (e) {
        console.error('saveFile failed:', e)
      }
  },

  deleteFile: async (filePath) => {
    if (!window.electronAPI?.deleteFile) return
    const { openFiles, activeFileId, fileContents } = get()
    let result
    try {
      result = await window.electronAPI.deleteFile(filePath)
    } catch (e) {
      console.error('deleteFile failed:', e)
      return
    }
    if (result?.success) {
      const remaining = openFiles.filter((f) => f.path !== filePath)
      const { [filePath]: _, ...restContents } = fileContents
      set({
        activeFileId: activeFileId === filePath ? (remaining[0]?.path || null) : activeFileId,
        openFiles: remaining,
        fileContents: restContents,
      })
      get().refreshTree()
    }
  },

  renameFile: async (oldPath, newName) => {
    if (!window.electronAPI?.renameFile) return
    const parts = oldPath.split(/[\\/]/)
    parts[parts.length - 1] = newName
    const newPath = parts.join('/')
    let result
    try {
      result = await window.electronAPI.renameFile(oldPath, newPath)
    } catch (e) {
      console.error('renameFile failed:', e)
      return
    }
    if (result?.success) {
      const state = get()
      const { [oldPath]: oldContent, ...restContents } = state.fileContents
      if (oldContent) {
        set({ fileContents: { ...restContents, [newPath]: oldContent } })
      }
      if (state.activeFileId === oldPath) set({ activeFileId: newPath })
      set({
        openFiles: state.openFiles.map((f) =>
          f.path === oldPath ? { ...f, path: newPath, name: newName } : f
        ),
      })
      get().refreshTree()
    }
  },

  createNewFolder: async () => {
    const { vaultPath } = get()
    if (!vaultPath || !window.electronAPI?.createDir) return
    const name = `New Folder-${Date.now()}`
    const path = `${vaultPath}/${name}`
    try {
      const result = await window.electronAPI.createDir(path)
      if (result?.success) get().refreshTree()
    } catch (e) {
      console.error('createNewFolder failed:', e)
    }
  },

  createNewNote: async () => {
    const { vaultPath } = get()
    if (!vaultPath || !window.electronAPI?.writeFile) return
    try {
      const { processTemplate, DEFAULT_NEW_NOTE_TEMPLATE } = await import('../engine/TemplateEngine')
      const name = `Untitled-${Date.now()}.md`
      const path = `${vaultPath}/${name}`
      const content = processTemplate(DEFAULT_NEW_NOTE_TEMPLATE, { title: name.replace('.md', '') })
      await window.electronAPI.writeFile(path, content)
      get().openFile(path)
      get().refreshTree()
    } catch (e) {
      console.error('createNewNote failed:', e)
    }
  },

  setActiveFile: (filePath) => set({ activeFileId: filePath }),

  updateMetadata: (filePath, metadata) => {
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === filePath ? { ...f, metadata, isDirty: true } : f
      ),
    }))
  },

  // --- UI Actions ---
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setRightSidebarView: (view) => set({ rightSidebarView: view }),
  toggleGraph: () => set((s) => ({ graphOpen: !s.graphOpen })),
  toggleCanvas: () => set((s) => ({ canvasOpen: !s.canvasOpen })),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleTheme: () => {
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('granite-theme', next)
      return { theme: next }
    })
  },
  setEditorFontSize: (size) => {
    set({ editorFontSize: size })
    localStorage.setItem('granite-font-size', String(size))
  },
  setEditorLineHeight: (lh) => {
    set({ editorLineHeight: lh })
    localStorage.setItem('granite-line-height', String(lh))
  },
  setDailyNotesFolder: (folder) => {
    set({ dailyNotesFolder: folder })
    localStorage.setItem('granite-daily-notes-folder', folder)
  },
  loadSettings: () => {
    const theme = localStorage.getItem('granite-theme') || 'dark'
    const editorFontSize = Number(localStorage.getItem('granite-font-size')) || 14
    const editorLineHeight = Number(localStorage.getItem('granite-line-height')) || 1.7
    const dailyNotesFolder = localStorage.getItem('granite-daily-notes-folder') || 'Daily'
    set({ theme, editorFontSize, editorLineHeight, dailyNotesFolder })
  },
  setExpandedFolders: (folders) => set({ expandedFolders: folders }),
  toggleFolder: (folderPath) =>
    set((s) => {
      const next = new Set(s.expandedFolders)
      if (next.has(folderPath)) next.delete(folderPath)
      else next.add(folderPath)
      return { expandedFolders: next }
    }),

  // --- Graph ---
  setLinkIndex: (index) => set({ linkIndex: index }),

  // --- Canvas ---
  setCanvasNodes: (nodes) => set({ canvasNodes: nodes }),
  setCanvasEdges: (edges) => set({ canvasEdges: edges }),
  addCanvasNode: (node) =>
    set((s) => ({ canvasNodes: [...s.canvasNodes, node] })),
  addCanvasEdge: (edge) =>
    set((s) => ({ canvasEdges: [...s.canvasEdges, edge] })),
  updateCanvasNode: (id, updates) =>
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
}))

export default useStore
