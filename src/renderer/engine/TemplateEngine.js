const TEMPLATE_VARIABLES = {
  date: () => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  },
  time: () => {
    const d = new Date()
    return d.toTimeString().split(' ')[0]
  },
  datetime: () => {
    return new Date().toISOString()
  },
  title: () => '',
  'date:YYYY-MM-DD': () => new Date().toISOString().split('T')[0],
  'date:YYYY-MM-DD-dddd': () => {
    const d = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `${d.toISOString().split('T')[0]} ${days[d.getDay()]}`
  },
  'time:HH:mm': () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },
}

export function processTemplate(template, variables = {}) {
  let result = template

  const allVars = { ...TEMPLATE_VARIABLES, ...variables }

  result = result.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (match, key, format) => {
    const fullKey = format ? `${key}:${format}` : key
    const resolver = allVars[fullKey] || allVars[key]
    if (typeof resolver === 'function') return resolver()
    if (resolver !== undefined) return String(resolver)
    return match
  })

  return result
}

export const DEFAULT_DAILY_NOTE_TEMPLATE = `# {{date:YYYY-MM-DD-dddd}}

## Tasks
- [ ]

## Notes

`

export const DEFAULT_NEW_NOTE_TEMPLATE = `# {{title}}

`

export function getDailyNotePath(vaultPath, date = new Date(), folder = 'Daily') {
  const dateStr = date.toISOString().split('T')[0]
  const dir = `${vaultPath}/${folder}`
  return { folder: dir, path: `${dir}/${dateStr}.md`, dateStr }
}
