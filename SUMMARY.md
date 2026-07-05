## Goal
- Fix runtime bugs and polish an Electron + React + CodeMirror 6 prototype at C:\Obsidian

## Constraints & Preferences
- All file operations go through electronAPI IPC bridge
- Code generation permitted (implementation mode)

## Progress
### Done
- Phase 1–9 initial implementation built: Electron scaffold, file watcher, CodeMirror 6 editor, YAML frontmatter editor, link index engine, D3 graph view, Bitap fuzzy search, infinite canvas (DOM transforms), plugin sandbox, dark/light theme, settings UI
- Fixed GraphView.jsx — removed dead `allNotes` destructuring
- Fixed Cmd+N — now calls `createNewNote()` instead of `toggleSearch()`
- Fixed CanvasView.jsx — close button calls `toggleCanvas` (was `toggleGraph`); added SVG edge layer, `connectMode` toggle
- Added `canvasOpen` / `toggleCanvas` to store; wired in App.jsx + TitleBar
- Settings persistence — `editorFontSize`, `editorLineHeight`, `dailyNotesFolder` in localStorage; `loadSettings()` hydrates on mount
- SettingsView reads/writes store instead of uncontrolled `defaultValue`
- Wired HoverPreview in App.jsx with `useHoverPreview` hook
- Context menu on Sidebar tree items — Rename/Delete via store actions
- New Note button (+) in Sidebar header with file filter input
- Fixed `closeFile` memory leak — prunes `fileContents[filePath]` on tab close
- Added CSS for canvas edges, context menu, sidebar-header-actions, titlebar-btn-active
- `openFolder` vault validation with `hasMdFiles()` helper; shows `confirm()` on empty vault
- Editor preview mode — CodeMirror source / react-markdown toggle; wikilinks resolve via linkIndex → `openFile`
- CSS for editor mode bar and markdown preview (~80 lines)
- `--editor-font-size` and `--editor-line-height` CSS variables applied via effect
- Fixed `computeUnlinkedMentions` — reads `l.target` instead of calling `.match()` on objects
- Removed dead `editorView` from store initial state
- `deleteFile` / `renameFile` store actions with electronAPI guards and `refreshTree()`
- `renameFile` correctly constructs new path from `oldPath` and `newName`
- Build succeeds — 0 errors (~1.23 MB JS, ~18.5 KB CSS)

**Bug-sweep round 1 (14 fixes, all verified via build):**
- HoverPreview timer leak — `timerRef` replaces returned cleanup; clears on each hover
- HoverPreview browser crash — `window.electronAPI?.readFile` guard; abort ref on unmount
- MarkdownEditor double save — removed duplicate DOM `keydown` listener (CodeMirror keymap handles `Mod-s`)
- FrontmatterEditor key rename — atomic remove+add in single `updateMetadata` call (was 2 calls with stale props)
- DailyNotes folder — `getDailyNotePath` accepts `folder` param; App passes `dailyNotesFolder` from store
- `saveFile` dead variable — removed unused `const frontmatter = yaml.dump(...)`
- `deleteFile` memory leak — prunes `fileContents[filePath]` via object rest
- `renameFile` stale tabs — updates `openFiles` paths + `fileContents` key + `activeFileId`
- App crash on any error — wrapped `<App>` in `<ErrorBoundary>` component
- SearchModal Cmd+N crash — added `case 'new-note': createNewNote(); break`
- RightSidebar "Add link" no-op — wired `handleAddLink` to insert `[[name]]` via `electronAPI.writeFile`
- Daily note opens on every vault load — `dailyOpenedRef` prevents re-open
- Build passes consistently

**Bug-sweep round 2 (14 fixes, all applied, build passes):**
- main.js dir watcher — callback params renamed to `addedDir`/`removedDir` (was shadowing outer `dirPath`)
- main.js `shell:openExternal` — wrapped in try/catch
- DailyNotes.js — all `window.electronAPI` calls guarded with `?.`
- linkIndex.js — `window.electronAPI.readFile`/`getTree` guarded with `?.`
- RightSidebar.jsx — `?.` guard on `window.electronAPI.writeFile`
- store.js `openFile` — IPC call wrapped in try/catch with null-result guard
- store.js `refreshIndex` — wrapped in try/catch
- store.js `renameFile` — prunes `oldPath` from `fileContents` via object rest
- EditorPane.jsx — `activeFile` memoized with `useMemo`
- EditorPane.jsx — preview renders `file.body` (was `file.content`, causing YAML bleed)
- GraphView.jsx — `openFile` ref stored via `useRef` to avoid D3 chart re-creation
- CanvasView.jsx — `connecting` state cleared on `mouseUp` (was stuck when `connectMode` off)
- GraphView.jsx — cleaned unused `g` variable (dead code)
- store.js — removed unused `import yaml from 'js-yaml'` (dead code)

**Bug-sweep round 3 (32 fixes, all applied, build passes):**
- **HIGH #1**: App.jsx `ensureDailyNote` — added `.catch()` to unhandled promise
- **MEDIUM #4-8**: store.js `saveFile`/`deleteFile`/`renameFile`/`createNewNote`/`refreshTree` — all wrapped in try/catch
- **MEDIUM #9-10**: Sidebar.jsx `handleDelete`/`handleRename` — wrapped in try/catch
- **MEDIUM #11**: RightSidebar.jsx `handleAddLink` — wrapped in try/catch, `?.` on `writeFile`
- **MEDIUM #12-13**: linkIndex.js — `?.` on `readFile` and `getTree` call sites (were guarded but inconsistent)
- **MEDIUM #14**: PluginEngine.js — `?.` on `readFile`/`writeFile` in sandbox API; `clearTimeout` in `unloadPlugin` for layoutReady timer
- **MEDIUM #15**: DailyNotes.js `createDir` — added `?.` on call, wrapped entire function in try/catch
- **MEDIUM #16**: HoverPreview.jsx — already had guard pattern (verified OK)
- **MEDIUM #18**: PluginEngine.js — `onLayoutReady` timeout now guarded by `plugin.enabled` check + `clearTimeout` on unload
- **MEDIUM #19**: App.jsx — `dailyOpenedRef` changed to track `vaultPath` value (was just `true`, reset on vault switch)
- **MEDIUM #20**: App.jsx — vaultPath `useEffect` deps added (`vaultPath`, `openFolder`)
- **MEDIUM #21**: GraphView.jsx — removed dead zoom button UI (state existed but no effect), removed unused `ZoomIn`/`ZoomOut`/`RotateCcw` imports
- **MEDIUM #22**: DailyNotes.js — removed dead `navigateDaily` function (never called, plus had logic bug)
- **MEDIUM #23**: graphEngine.js — removed dead `runForceSimulation` (never called, logic duplicated inline in GraphView)
- **LOW #32**: App.jsx — removed unused `SettingsView` import (component never rendered)
- **LOW #33-36**: Removed unused lucide-react icon imports across GraphView (`ZoomIn`/`ZoomOut`/`RotateCcw`), SearchModal (`Hash`), RightSidebar (`ArrowLeft`), Sidebar (`MoreHorizontal`), EditorPane (`FileText`, `useEffect`, `useRef`)
- **LOW #43**: GraphView.jsx — moved `openFileRef.current` assignment from render body into `useEffect`
- **LOW #44**: main.js `app.whenReady()` — added `.catch()`

### In Progress
- (none)

## Key Decisions
- Fix and polish existing prototype over pivot to Sprint 1-10 redesign
- Settings persisted to localStorage (not obsidian.json) for simplicity
- CanvasView uses SVG edge overlay (not Canvas2D) — coordinates derived from memoized node position map
- File content cleanup on tab close uses object rest to remove key from `fileContents`
- HoverPreview triggers on `data-wikilink` mouseover once reading mode exists
- Vault validation uses `confirm()` dialog (no toast library available)
- `deleteFile` / `renameFile` exposed as store actions for consistency and `refreshTree()` calls after mutation
- Editor preview mode pre-resolves wikilinks to markdown links in `renderedContent` memo

## Next Steps
- Wire PluginEngine — instantiate in App.jsx lifecycle, fire hooks on file open/save
- Add tag pane in right sidebar with per-tag note counts and click-to-filter
- Add wikilink click navigation in CodeMirror source mode (Ctrl+Click on `[[wikilink]]` opens target via CM6 extension)
- Add autosave on blur / periodic autosave for dirty files
- Audit console errors on real vault load

## Critical Context
- `window.electronAPI` is undefined in browser dev mode — all store actions now guarded across all components
- HoverPreview and CanvasView were imported but never rendered in App.jsx — now both wired
- Canvas edge rendering now functional: SVG lines between node centers, connect mode with dashed preview line
- Settings were purely cosmetic (defaultValue only) — now functional with store-backed persistence
- Cmd+N previously toggled search (duplicate of Cmd+P) — fixed to create new note
- `computeUnlinkedMentions` would crash on any vault with outgoing links — now reads `l.target` safely
- dir watcher `relative` path was always `""` for `addDir`/`unlinkDir` events — fixed by renaming callback params
- `shell:openExternal` IPC handler could crash Electron process with unhandled rejection — now wrapped in try/catch
- YAML frontmatter was bleeding into rendered markdown preview — fixed by using `file.body` over `file.content`
- D3 graph chart was recreating on every render due to unstable `openFile` reference — fixed with `useRef` pattern
- Canvas `connecting` state would get stuck when exiting connect mode — fixed by clearing on every `mouseUp`
- Build output JS is ~1.23 MB (CodeMirror + D3 + KaTeX + react-markdown), chunk size warning is cosmetic

## Relevant Files
- C:\Obsidian\src\renderer\store\store.js: vault validation via hasMdFiles(), electronAPI guards, computeUnlinkedMentions fix, deleteFile/renameFile actions, fileContents prune on delete/rename, openFile/refreshIndex try/catch, renameFile fileContents prune
- C:\Obsidian\src\renderer\App.jsx: font/size CSS variables via effect, Cmd+N→createNewNote, dailyOpenedRef guard, ErrorBoundary wrapper
- C:\Obsidian\src\renderer\components\EditorPane.jsx: Edit/Preview mode toggle, react-markdown with clickable wikilinks, renderedContent memo uses file.body, activeFile memoized
- C:\Obsidian\src\renderer\components\Sidebar.jsx: context menu uses store.deleteFile/store.renameFile
- C:\Obsidian\src\renderer\components\HoverPreview.jsx: timerRef cleanup, electronAPI guard, abort ref
- C:\Obsidian\src\renderer\components\RightSidebar.jsx: handleAddLink wired, electronAPI guard
- C:\Obsidian\src\renderer\components\SearchModal.jsx: new-note case added
- C:\Obsidian\src\renderer\components\ErrorBoundary.jsx: new file — class component wrapping App
- C:\Obsidian\src\renderer\components\GraphView.jsx: openFile ref (useRef), cleaned dead g variable
- C:\Obsidian\src\renderer\components\CanvasView.jsx: connecting state cleared on mouseUp
- C:\Obsidian\src\renderer\editor\FrontmatterEditor.jsx: atomic key rename update
- C:\Obsidian\src\renderer\engine\DailyNotes.js: folderName param, electronAPI guards
- C:\Obsidian\src\renderer\engine\linkIndex.js: electronAPI guard on readFile/getTree
- C:\Obsidian\src\renderer\engine\TemplateEngine.js: getDailyNotePath accepts folder param
- C:\Obsidian\src\main\main.js: dir watcher callback param rename, shell.openExternal try/catch
- C:\Obsidian\src\renderer\styles\app.css: editor-mode-bar, markdown-preview styles, canvas edges, context menu
- C:\Obsidian\src\main\preload.js: deleteFile, renameFile, deleteDir IPC bindings (confirmed present)
