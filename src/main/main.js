const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')

let mainWindow = null
let vaultWatcher = null
let vaultPath = null

const appIconPath = path.join(__dirname, '../../assets/icon.png')
const userDataPath = app.getPath('userData')
const configPath = path.join(userDataPath, 'window-state.json')
const vaultConfigPath = path.join(userDataPath, 'vault-path.json')

function loadWindowState() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch {}
  return { width: 1400, height: 900 }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    const isMaximized = mainWindow.isMaximized()
    fs.writeFileSync(configPath, JSON.stringify({ ...bounds, isMaximized }), 'utf-8')
  } catch {}
}

function loadVaultPath() {
  try {
    if (fs.existsSync(vaultConfigPath)) {
      const data = JSON.parse(fs.readFileSync(vaultConfigPath, 'utf-8'))
      if (data.path && fs.existsSync(data.path)) return data.path
    }
  } catch {}
  return null
}

function saveVaultPath(dirPath) {
  try {
    fs.writeFileSync(vaultConfigPath, JSON.stringify({ path: dirPath }), 'utf-8')
  } catch {}
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac ? [{
      label: 'Granite',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:newNote'),
        },
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow?.webContents.send('menu:newFolder'),
        },
        { type: 'separator' },
        {
          label: 'Open Folder as Vault…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:openFolder'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit', label: 'Exit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow?.webContents.send('menu:toggleSidebar'),
        },
        {
          label: 'Toggle Right Sidebar',
          accelerator: 'CmdOrCtrl+Shift+\\',
          click: () => mainWindow?.webContents.send('menu:toggleRightSidebar'),
        },
        {
          label: 'Toggle Graph View',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow?.webContents.send('menu:toggleGraph'),
        },
        {
          label: 'Toggle Canvas',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu:toggleCanvas'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('menu:toggleTheme'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: '?',
          click: () => mainWindow?.webContents.send('menu:showHelp'),
        },
        {
          label: 'About Granite',
          click: () => mainWindow?.webContents.send('menu:showAbout'),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (state.isMaximized) mainWindow.maximize()

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximizedChanged', true)
    saveWindowState()
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximizedChanged', false)
    saveWindowState()
  })
}

// --- Single Instance Lock ---

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// --- File System Engine ---

function startWatching(dirPath) {
  if (vaultWatcher) vaultWatcher.close()
  vaultPath = dirPath

  const ignorePatterns = [
    /[/\\]\.git[/\\]/,
    /[/\\]node_modules[/\\]/,
    /\.DS_Store$/,
    /thumbs\.db$/i,
    /\.obsidian[/\\]/,
  ]

  vaultWatcher = chokidar.watch(dirPath, {
    ignored: (testPath) => ignorePatterns.some((p) => p.test(testPath)),
    persistent: true,
    ignoreInitial: true,
    depth: 20,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  vaultWatcher
    .on('add', (filePath) => {
      const relative = path.relative(dirPath, filePath)
      mainWindow?.webContents.send('file:created', { path: filePath, relative })
    })
    .on('change', (filePath) => {
      const relative = path.relative(dirPath, filePath)
      mainWindow?.webContents.send('file:changed', { path: filePath, relative })
    })
    .on('unlink', (filePath) => {
      const relative = path.relative(dirPath, filePath)
      mainWindow?.webContents.send('file:deleted', { path: filePath, relative })
    })
    .on('addDir', (addedDir) => {
      const relative = path.relative(dirPath, addedDir)
      mainWindow?.webContents.send('dir:created', { path: addedDir, relative })
    })
    .on('unlinkDir', (removedDir) => {
      const relative = path.relative(dirPath, removedDir)
      mainWindow?.webContents.send('dir:deleted', { path: removedDir, relative })
    })
}

async function getVaultTree(dirPath, prefix = '') {
  const entries = []
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue
      const fullPath = path.join(dirPath, item.name)
      const relative = prefix ? `${prefix}/${item.name}` : item.name
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: fullPath,
          relative,
          type: 'directory',
          children: await getVaultTree(fullPath, relative),
        })
      } else if (item.name.endsWith('.md') || /\.(png|jpg|jpeg|gif|svg|webp|pdf)$/i.test(item.name)) {
        entries.push({
          name: item.name,
          path: fullPath,
          relative,
          type: 'file',
          ext: path.extname(item.name).toLowerCase(),
        })
      }
    }
  } catch {}
  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// --- IPC Handlers ---

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0]
    startWatching(dir)
    saveVaultPath(dir)
    return { path: dir, tree: await getVaultTree(dir) }
  }
  return null
})

ipcMain.handle('vault:getTree', async (_event, dirPath) => {
  const target = dirPath || vaultPath
  if (!target) return []
  return getVaultTree(target)
})

ipcMain.handle('vault:openByPath', async (_event, dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return null
  startWatching(dirPath)
  saveVaultPath(dirPath)
  const tree = await getVaultTree(dirPath)
  return { path: dirPath, tree }
})

ipcMain.handle('vault:getSavedPath', () => {
  return loadVaultPath()
})

ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const stat = await fs.promises.stat(filePath)
    return { content, mtimeMs: stat.mtimeMs }
  } catch (err) {
    return { content: '', error: err.message }
  }
})

ipcMain.handle('file:write', async (_event, filePath, content) => {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:create', async (_event, filePath, content = '') => {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:delete', async (_event, filePath) => {
  try {
    await fs.promises.unlink(filePath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:rename', async (_event, oldPath, newPath) => {
  try {
    await fs.promises.mkdir(path.dirname(newPath), { recursive: true })
    await fs.promises.rename(oldPath, newPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('dir:create', async (_event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('dir:delete', async (_event, dirPath) => {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:exists', async (_event, filePath) => {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('shell:openExternal', async (_event, url) => {
  try {
    await shell.openExternal(url)
  } catch (e) {
    console.error('Failed to open external:', e.message)
  }
})

// --- Window Controls ---

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// --- App Lifecycle ---

const iconPath = path.join(__dirname, '../../assets/icon.png')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.granite.app')
}

app.whenReady().then(() => {
  buildAppMenu()
  createWindow()
}).catch((err) => console.error('App init failed:', err))

app.on('window-all-closed', () => {
  if (vaultWatcher) vaultWatcher.close()
  saveWindowState()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
