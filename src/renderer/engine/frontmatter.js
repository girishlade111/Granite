import yaml from 'js-yaml'

export function parseFrontmatter(content) {
  const result = { metadata: {}, body: content }

  if (!content || !content.startsWith('---')) return result

  const endIndex = content.indexOf('---', 3)
  if (endIndex === -1) return result

  const raw = content.slice(3, endIndex).trim()
  const body = content.slice(endIndex + 3).trim()

  try {
    result.metadata = yaml.load(raw) || {}
  } catch {
    result.metadata = {}
  }
  result.body = body || ''
  return result
}

export function serializeFrontmatter(metadata, body) {
  if (!metadata || Object.keys(metadata).length === 0) return body
  const frontmatter = yaml.dump(metadata, { lineWidth: 120, noRefs: true }).trim()
  return `---\n${frontmatter}\n---\n${body}`
}

export function updateMetadata(originalContent, newMetadata) {
  const { metadata: _, body } = parseFrontmatter(originalContent)
  return serializeFrontmatter(newMetadata, body)
}
