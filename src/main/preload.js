const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // Vault
  getTree: (dirPath) => ipcRenderer.invoke('vault:getTree', dirPath),
  getSavedVaultPath: () => ipcRenderer.invoke('vault:getSavedPath'),
  openByPath: (dirPath) => ipcRenderer.invoke('vault:openByPath', dirPath),

  // File operations
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  createFile: (filePath, content) => ipcRenderer.invoke('file:create', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),

  // Directory operations
  createDir: (dirPath) => ipcRenderer.invoke('dir:create', dirPath),
  deleteDir: (dirPath) => ipcRenderer.invoke('dir:delete', dirPath),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChanged: (callback) => {
    const handler = (_event, value) => callback(value)
    ipcRenderer.on('window:maximizedChanged', handler)
    return () => ipcRenderer.removeListener('window:maximizedChanged', handler)
  },

  // File watcher events
  onFileCreated: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('file:created', handler)
    return () => ipcRenderer.removeListener('file:created', handler)
  },
  onFileChanged: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('file:changed', handler)
    return () => ipcRenderer.removeListener('file:changed', handler)
  },
  onFileDeleted: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('file:deleted', handler)
    return () => ipcRenderer.removeListener('file:deleted', handler)
  },

  // Menu events
  onMenuNewNote: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:newNote', handler)
    return () => ipcRenderer.removeListener('menu:newNote', handler)
  },
  onMenuNewFolder: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:newFolder', handler)
    return () => ipcRenderer.removeListener('menu:newFolder', handler)
  },
  onMenuOpenFolder: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:openFolder', handler)
    return () => ipcRenderer.removeListener('menu:openFolder', handler)
  },
  onMenuSave: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:save', handler)
    return () => ipcRenderer.removeListener('menu:save', handler)
  },
  onMenuToggleSidebar: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:toggleSidebar', handler)
    return () => ipcRenderer.removeListener('menu:toggleSidebar', handler)
  },
  onMenuToggleRightSidebar: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:toggleRightSidebar', handler)
    return () => ipcRenderer.removeListener('menu:toggleRightSidebar', handler)
  },
  onMenuToggleGraph: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:toggleGraph', handler)
    return () => ipcRenderer.removeListener('menu:toggleGraph', handler)
  },
  onMenuToggleCanvas: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:toggleCanvas', handler)
    return () => ipcRenderer.removeListener('menu:toggleCanvas', handler)
  },
  onMenuToggleTheme: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:toggleTheme', handler)
    return () => ipcRenderer.removeListener('menu:toggleTheme', handler)
  },
  onMenuShowHelp: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:showHelp', handler)
    return () => ipcRenderer.removeListener('menu:showHelp', handler)
  },
})
