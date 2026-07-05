// Plugin sandbox and lifecycle manager for third-party extensions

export class PluginEngine {
  constructor(api) {
    this.api = api
    this.plugins = new Map()
    this.hooks = {
      onLayoutReady: [],
      onFileOpen: [],
      onFileSave: [],
      onModify: [],
      onMarkdownRender: [],
      onEditorChange: [],
      onVaultChange: [],
    }
  }

  registerHook(hookName, handler) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].push(handler)
    }
  }

  async loadPlugin(manifest, script) {
    const id = manifest.id || manifest.name?.toLowerCase().replace(/\s+/g, '-')

    if (this.plugins.has(id)) {
      console.warn(`Plugin "${id}" already loaded`)
      return null
    }

    // Create sandboxed context
    const pluginApi = this.createPluginApi(id, manifest)

    try {
      // Execute plugin in a sandboxed function context
      const pluginFn = new Function('api', 'console', script)
      const instance = pluginFn(pluginApi, {
        log: (...args) => console.log(`[${id}]`, ...args),
        warn: (...args) => console.warn(`[${id}]`, ...args),
        error: (...args) => console.error(`[${id}]`, ...args),
      })

      const plugin = {
        id,
        manifest,
        instance,
        enabled: true,
        api: pluginApi,
      }

      this.plugins.set(id, plugin)

      // Lifecycle: onLayoutReady
      if (manifest.hooks?.includes('onLayoutReady')) {
        const timer = setTimeout(() => {
          if (plugin.enabled) pluginApi.runHook('onLayoutReady')
        }, 0)
        plugin._layoutTimer = timer
      }

      return plugin
    } catch (err) {
      console.error(`Failed to load plugin "${id}":`, err)
      return null
    }
  }

  unloadPlugin(id) {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.enabled = false
      clearTimeout(plugin._layoutTimer)
      this.plugins.delete(id)
    }
  }

  createPluginApi(pluginId, manifest) {
    const engine = this

    return {
      id: pluginId,
      manifest,

      // Hook registration
      onFileOpen(handler) { engine.registerHook('onFileOpen', handler) },
      onFileSave(handler) { engine.registerHook('onFileSave', handler) },
      onModify(handler) { engine.registerHook('onModify', handler) },
      onMarkdownRender(handler) { engine.registerHook('onMarkdownRender', handler) },
      onEditorChange(handler) { engine.registerHook('onEditorChange', handler) },
      onVaultChange(handler) { engine.registerHook('onVaultChange', handler) },

      // Run hooks
      runHook(hookName, ...args) {
        const handlers = engine.hooks[hookName] || []
        for (const handler of handlers) {
          try { handler(...args) } catch (err) {
            console.error(`[${pluginId}] Hook ${hookName} error:`, err)
          }
        }
      },

      // File API (limited)
      readFile: async (path) => {
        return window.electronAPI?.readFile?.(path) ?? null
      },

      writeFile: async (path, content) => {
        return window.electronAPI?.writeFile?.(path, content) ?? null
      },

      // UI API
      addRibbonIcon: (icon, tooltip, callback) => {
        document.dispatchEvent(new CustomEvent('plugin:addRibbonIcon', {
          detail: { pluginId, icon, tooltip, callback },
        }))
      },

      addCommand: (command) => {
        document.dispatchEvent(new CustomEvent('plugin:addCommand', {
          detail: { pluginId, command },
        }))
      },

      addSettingTab: (tab) => {
        document.dispatchEvent(new CustomEvent('plugin:addSettingTab', {
          detail: { pluginId, tab },
        }))
      },

      // Markdown post-processing
      registerMarkdownPostProcessor: (processor) => {
        engine.registerHook('onMarkdownRender', processor)
      },
    }
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values()).filter((p) => p.enabled)
  }

  getPlugin(id) {
    return this.plugins.get(id)
  }
}

export const pluginEngine = new PluginEngine({})
