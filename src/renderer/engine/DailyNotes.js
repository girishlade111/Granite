import { processTemplate, getDailyNotePath, DEFAULT_DAILY_NOTE_TEMPLATE } from './TemplateEngine'

export async function ensureDailyNote(vaultPath, folderName = 'Daily') {
  if (!vaultPath) return null

  try {
    const { folder, path } = getDailyNotePath(vaultPath, new Date(), folderName)

    const exists = await window.electronAPI?.fileExists?.(path) ?? false
    if (exists) return path

    if (!window.electronAPI?.createDir) return null
    await window.electronAPI.createDir?.(folder)
    if (!window.electronAPI?.createFile) return null

    const content = processTemplate(DEFAULT_DAILY_NOTE_TEMPLATE)

    const result = await window.electronAPI.createFile?.(path, content)
    if (result?.success) return path
  } catch (e) {
    console.error('ensureDailyNote failed:', e)
  }

  return null
}

export function getDateFromFilePath(filePath) {
  const match = filePath.match(/(\d{4}-\d{2}-\d{2})\.md$/)
  return match ? match[1] : null
}
