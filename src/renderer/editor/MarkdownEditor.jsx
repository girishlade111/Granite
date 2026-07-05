import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, Decoration } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, indentOnInput, bracketMatching } from '@codemirror/language'
import { closeBrackets, autocompletion } from '@codemirror/autocomplete'
import { searchKeymap } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import useStore from '../store/store'

const tagDeco = Decoration.mark({ class: 'cm-tag-highlight' })
const highlightDeco = Decoration.mark({ class: 'cm-highlight-marker' })
const checkboxDeco = Decoration.mark({ class: 'cm-checkbox' })

function tagHighlighter() {
  return StateField.define({
    create() { return Decoration.none },
    update(decos, tr) {
      if (!tr.docChanged) return decos
      const decorations = []
      const seen = new Set()
      const text = tr.state.doc.toString()
      const regex = /(?:^|\s)(#[^\s#!@$%^&*()=+[\]{}|;:'",.<>/?`~]+)/g
      let match
      while ((match = regex.exec(text)) !== null) {
        const from = match.index + match[0].indexOf(match[1])
        const to = from + match[1].length
        if (!seen.has(from)) {
          seen.add(from)
          decorations.push(tagDeco.range(from, to))
        }
      }
      return Decoration.set(decorations, true)
    },
    provide: f => EditorView.decorations.from(f),
  })
}

function highlightDecorator() {
  return StateField.define({
    create() { return Decoration.none },
    update(decos, tr) {
      if (!tr.docChanged) return decos
      const decorations = []
      const text = tr.state.doc.toString()
      const regex = /==([^=]+)==/g
      let match
      while ((match = regex.exec(text)) !== null) {
        decorations.push(highlightDeco.range(match.index, match.index + match[0].length))
      }
      return Decoration.set(decorations, true)
    },
    provide: f => EditorView.decorations.from(f),
  })
}

function wikilinksSource(context) {
  const before = context.matchBefore(/\[\[[^\]|]*/)
  if (!before || before.from < 0) return null
  const text = context.state.sliceDoc(before.from)
  if (!text.startsWith('[[')) return null
  const typed = text.slice(2)
  const { linkIndex } = useStore.getState()
  const noteNames = (linkIndex?.allNotes || [])
    .map(n => (n.name || '').replace(/\.md$/i, ''))
    .filter(Boolean)
  const options = noteNames
    .filter(name => name.toLowerCase().includes(typed.toLowerCase()))
    .slice(0, 20)
    .map(name => ({ label: name, type: 'keyword' }))
  return {
    from: before.from + 2,
    options,
    filter: false,
  }
}

function createEventHandlers() {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if ((event.metaKey || event.ctrlKey) && event.button === 0) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos == null) return false
        const text = view.state.doc.toString()
        const start = text.lastIndexOf('[[', pos)
        if (start === -1 || start > pos) return false
        const end = text.indexOf(']]', pos)
        if (end === -1) return false
        const inner = text.slice(start + 2, end)
        const linkTarget = inner.includes('|') ? inner.split('|')[0] : inner.split('#')[0] || inner
        const { linkIndex, openFile } = useStore.getState()
        const noteMap = linkIndex?.noteMap || {}
        const resolved = noteMap[linkTarget.trim().toLowerCase()]
        if (resolved) {
          event.preventDefault()
          openFile(resolved)
          return true
        }
        return false
      }

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const line = view.state.doc.lineAt(pos)
      const cbMatch = line.text.match(/^(\s*[-*+]\s+)(\[[ x]\])\s/)
      if (!cbMatch) return false
      const cbStart = line.from + line.text.indexOf(cbMatch[2])
      const cbEnd = cbStart + 3
      if (pos >= cbStart && pos <= cbEnd) {
        event.preventDefault()
        const checked = line.text.includes('[x]')
        view.dispatch({
          changes: { from: cbStart, to: cbEnd, insert: checked ? '[ ]' : '[x]' },
        })
        return true
      }
      return false
    },

    paste(event, view) {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (!file) return false
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = reader.result
            const vaultPath = useStore.getState().vaultPath
            if (!vaultPath || !window.electronAPI?.writeBase64File) return
            const sep = window.electronAPI.pathSep || '/'
            const imagesDir = `${vaultPath}${sep}images`
            const ext = item.type.split('/')[1] || 'png'
            const filename = `pasted-${Date.now()}.${ext}`
            const filePath = `${imagesDir}${sep}${filename}`
            const result = await window.electronAPI.writeBase64File(filePath, base64)
            if (result?.success) {
              view.dispatch({
                changes: { from: view.state.selection.main.head, insert: `![${filename}](images/${filename})` },
              })
            }
          }
          reader.readAsDataURL(file)
          return true
        }
      }
      return false
    },
  })
}

export default function MarkdownEditor({ content, onChange, onSave }) {
  const editorRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  useEffect(() => {
    if (!editorRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString())
      }
    })

    const saveKey = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          onSaveRef.current?.()
          return true
        },
      },
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
    ])

    const state = EditorState.create({
      doc: content || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        closeBrackets(),
        autocompletion({ override: [wikilinksSource] }),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        tagHighlighter(),
        highlightDecorator(),
        createEventHandlers(),
        oneDark,
        placeholder('Start writing...'),
        updateListener,
        saveKey,
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentContent = view.state.doc.toString()
    if (content !== undefined && content !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content || '',
        },
      })
    }
  }, [content])

  return <div className="codemirror-editor" ref={editorRef} />
}
