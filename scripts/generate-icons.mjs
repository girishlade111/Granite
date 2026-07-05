import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
const svgPath = path.resolve('assets/icon.svg')
const outputDir = path.resolve('assets')
const publicDir = path.resolve('public')

fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(publicDir, { recursive: true })

const svgBuffer = fs.readFileSync(svgPath)

async function generate() {
  const results = []

  for (const size of sizes) {
    const pngPath = path.join(outputDir, `icon-${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(pngPath)
    results.push(pngPath)
    console.log(`✓ ${size}x${size} PNG`)
  }

  // Copy 256 as the default favicon/icon
  fs.copyFileSync(path.join(outputDir, 'icon-256.png'), path.join(outputDir, 'icon.png'))
  fs.copyFileSync(path.join(outputDir, 'icon-256.png'), path.join(publicDir, 'icon.png'))
  fs.copyFileSync(svgPath, path.join(publicDir, 'icon.svg'))
  console.log('✓ Copied default icon (256) to assets/ and public/')

  // Generate ICO: use sizes up to 256 (ICO doesn't support >256 well)
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = []
  for (const size of icoSizes) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer()
    icoBuffers.push({ size, buffer: buf })
  }

  const icoPath = path.join(outputDir, 'icon.ico')
  const icoPublicPath = path.join(publicDir, 'favicon.ico')
  writeIco(icoBuffers, icoPath)
  fs.copyFileSync(icoPath, icoPublicPath)
  console.log('✓ icon.ico')
}

function writeIco(entries, outputPath) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)       // reserved
  header.writeUInt16LE(1, 2)       // ICO type
  header.writeUInt16LE(entries.length, 4)

  const dir = []
  let offset = 6 + entries.length * 16
  const imageBuffers = []

  for (const entry of entries) {
    const buf = entry.buffer
    const size = entry.size
    // PNG data already includes the ICO directory entry
    const info = Buffer.alloc(16)
    info.writeUInt8(size >= 256 ? 0 : size, 0)  // width
    info.writeUInt8(size >= 256 ? 0 : size, 1)   // height
    info.writeUInt8(0, 2)  // colors
    info.writeUInt8(0, 3)  // reserved
    info.writeUInt16LE(1, 4)  // planes
    info.writeUInt16LE(32, 6) // bpp
    info.writeUInt32LE(buf.length, 8)  // image size
    info.writeUInt32LE(offset, 12)     // offset
    dir.push(info)
    imageBuffers.push(buf)
    offset += buf.length
  }

  const dirBuffer = Buffer.concat(dir)
  const imagesBuffer = Buffer.concat(imageBuffers)
  const final = Buffer.concat([header, dirBuffer, imagesBuffer])
  fs.writeFileSync(outputPath, final)
}

generate().catch(err => { console.error(err); process.exit(1) })
