const MAX_RESULTS = 50

export function bitapSearch(text, pattern, maxErrors = 2) {
  if (pattern.length === 0) return false

  const m = pattern.length
  const alphabet = {}
  let resultMask = 0

  for (let i = 0; i < m; i++) {
    alphabet[pattern[i]] = (alphabet[pattern[i]] || 0) | (1 << i)
  }

  const R = new Array(maxErrors + 1)
  for (let i = 0; i <= maxErrors; i++) {
    R[i] = ~((1 << i) - 1)
  }

  for (let j = 0; j < text.length; j++) {
    const char = text[j]
    const charMask = alphabet[char] || 0
    let oldRd1 = R[0]

    R[0] = (R[0] << 1) | 1
    R[0] |= charMask

    for (let k = 1; k <= maxErrors; k++) {
      const tmp = R[k]
      R[k] = ((R[k] << 1) | 1) & charMask & oldRd1
      R[k] |= ((oldRd1 << 1) | 1) & ~charMask
      R[k] |= R[k - 1] << 1
      oldRd1 = tmp
    }

    if ((R[maxErrors] & (1 << (m - 1))) === 0) {
      return true
    }
  }
  return false
}

function calculateScore(text, pattern) {
  const lowerText = text.toLowerCase()
  const lowerPattern = pattern.toLowerCase()
  let score = 0

  if (lowerText === lowerPattern) return 100
  if (lowerText.startsWith(lowerPattern)) score += 50
  if (lowerText.includes(lowerPattern)) score += 30

  const words = lowerText.split(/[\s_-]+/)
  for (const word of words) {
    if (word.startsWith(lowerPattern)) score += 20
    if (word.includes(lowerPattern)) score += 10
  }

  const camelMatch = lowerText.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  if (camelMatch.includes(lowerPattern)) score += 15

  if (bitapSearch(lowerText, lowerPattern, 1)) score += 5

  return score
}

export function searchItems(items, query, getText) {
  if (!query || query.length === 0) return items.slice(0, MAX_RESULTS)

  const results = []
  const lowerQuery = query.toLowerCase()

  for (const item of items) {
    const text = getText(item)
    const score = calculateScore(text, lowerQuery)
    if (score > 0) {
      results.push({ item, score, matchText: text })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, MAX_RESULTS).map((r) => r.item)
}

export function searchFiles(files, query) {
  return searchItems(files, query, (f) => f.name || f.path)
}

export function searchCommands(commands, query) {
  return searchItems(commands, query, (c) => c.name + ' ' + c.keywords)
}

export const COMMAND_PALETTE_COMMANDS = [
  { id: 'open-note', name: 'Open Quick Switcher', keywords: 'open note file switch', shortcut: 'Cmd+O' },
  { id: 'search', name: 'Search in Vault', keywords: 'search find text', shortcut: 'Cmd+Shift+F' },
  { id: 'graph', name: 'Open Graph View', keywords: 'graph view visualize', shortcut: 'Cmd+Shift+G' },
  { id: 'daily-note', name: 'Open Daily Note', keywords: 'daily note today', shortcut: 'Cmd+Shift+D' },
  { id: 'toggle-sidebar', name: 'Toggle Sidebar', keywords: 'sidebar toggle', shortcut: 'Cmd+\\' },
  { id: 'toggle-right', name: 'Toggle Right Sidebar', keywords: 'right sidebar toggle backlinks', shortcut: 'Cmd+Shift+\\' },
  { id: 'theme', name: 'Toggle Theme (Dark/Light)', keywords: 'theme dark light toggle', shortcut: '' },
  { id: 'save', name: 'Save Current Note', keywords: 'save file', shortcut: 'Cmd+S' },
  { id: 'new-note', name: 'New Note', keywords: 'new note create file', shortcut: 'Cmd+N' },
  { id: 'new-folder', name: 'New Folder', keywords: 'new folder create directory', shortcut: '' },
  { id: 'delete-file', name: 'Delete Current File', keywords: 'delete remove file', shortcut: '' },
  { id: 'rename-file', name: 'Rename Current File', keywords: 'rename file', shortcut: '' },
  { id: 'help', name: 'Show Help', keywords: 'help about', shortcut: '?' },
]
