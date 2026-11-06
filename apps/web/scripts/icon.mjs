// 產生網頁版圖示（用法：node scripts/icon.mjs 192）：圓角藍底、白色的「壓縮」圖形。只用 Node 內建的 zlib，不新增相依套件。
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const S = Number(process.argv[2] ?? 128)
const px = Buffer.alloc(S * (S * 4 + 1))
const inRounded = (x, y, r) => {
  const cx = Math.min(Math.max(x, r), S - 1 - r)
  const cy = Math.min(Math.max(y, r), S - 1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
for (let y = 0; y < S; y++) {
  px[y * (S * 4 + 1)] = 0 // filter: none
  for (let x = 0; x < S; x++) {
    const o = y * (S * 4 + 1) + 1 + x * 4
    let c = [0, 0, 0, 0]
    const u = (v) => Math.round((v * S) / 128)
    if (inRounded(x, y, u(24))) c = [47, 91, 211, 255]
    // 外框（大方塊）與內框（小方塊）：表示「壓縮」
    const outer =
      x >= u(30) &&
      x < u(98) &&
      y >= u(30) &&
      y < u(98) &&
      (x < u(38) || x >= u(90) || y < u(38) || y >= u(90))
    const inner = x >= u(50) && x < u(78) && y >= u(50) && y < u(78)
    if (outer || inner) c = [255, 255, 255, 255]
    px.set(c, o)
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8
ihdr[9] = 6 // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(px)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL(`../public/icon-${S}.png`, import.meta.url), png)
console.log(`icon-${S}.png written`, png.length, 'bytes')
