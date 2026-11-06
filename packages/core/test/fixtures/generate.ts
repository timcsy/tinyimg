import type { RawImage } from '../../src/types'

/** 確定性的偽亂數（mulberry32） */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function blank(width: number, height: number, rgba = [255, 255, 255, 255]): RawImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0]!
    data[i + 1] = rgba[1]!
    data[i + 2] = rgba[2]!
    data[i + 3] = rgba[3]!
  }
  return { width, height, data }
}

/** 照片風格：平滑漸層加上細節雜訊，有損壓縮的典型對象 */
export function photo(width = 3000, height = 2000, seed = 1): RawImage {
  const r = rng(seed)
  const img = blank(width, height)
  const d = img.data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const n = (r() - 0.5) * 60
      d[i] = (x / width) * 200 + 30 + n
      d[i + 1] = (y / height) * 180 + 40 + n
      d[i + 2] = ((x + y) / (width + height)) * 220 + 20 + n
    }
  }
  return img
}

/** 截圖風格：平塗色塊、細線與文字狀筆畫，色數少、邊緣銳利 */
export function screenshot(width = 1920, height = 1080, seed = 1): RawImage {
  const r = rng(seed)
  const palette = Array.from({ length: 14 }, () => [
    Math.floor(r() * 256),
    Math.floor(r() * 256),
    Math.floor(r() * 256),
  ])
  const img = blank(width, height, [246, 247, 249, 255])
  const fill = (x0: number, y0: number, w: number, h: number, c: number[]) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(width, x0 + w); x++) {
        const i = (y * width + x) * 4
        img.data[i] = c[0]!
        img.data[i + 1] = c[1]!
        img.data[i + 2] = c[2]!
      }
    }
  }
  // 側欄與標題列
  fill(0, 0, Math.floor(width * 0.18), height, palette[0]!)
  fill(0, 0, width, 56, palette[1]!)
  // 卡片
  for (let k = 0; k < 24; k++) {
    const w = 120 + Math.floor(r() * 400)
    const h = 60 + Math.floor(r() * 220)
    fill(Math.floor(r() * width), Math.floor(r() * height), w, h, palette[2 + (k % 10)]!)
  }
  // 標題列漸層（真實 UI 常見，色數多）
  for (let y = 0; y < 56; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      img.data[i] = 40 + (x / width) * 80
      img.data[i + 1] = 90 + (y / 56) * 60
      img.data[i + 2] = 200 - (x / width) * 60
    }
  }
  // 內嵌照片（例如網頁中的圖片）
  const pw = Math.floor(width * 0.5)
  const ph = Math.floor(height * 0.55)
  const px = Math.floor(width * 0.45)
  const py = Math.floor(height * 0.15)
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = ((py + y) * width + px + x) * 4
      const n = (r() - 0.5) * 50
      img.data[i] = (x / pw) * 200 + 30 + n
      img.data[i + 1] = (y / ph) * 160 + 50 + n
      img.data[i + 2] = 120 + n
    }
  }
  // 文字狀筆畫：深色字身加上反鋸齒的半透明邊緣
  const ink = [33, 37, 41]
  const blend = (x: number, y: number, a: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = (y * width + x) * 4
    for (let c = 0; c < 3; c++) img.data[i + c] = img.data[i + c]! * (1 - a) + ink[c]! * a
  }
  for (let line = 0; line < height / 22; line++) {
    let x = Math.floor(width * 0.2) + Math.floor(r() * 40)
    const y = 70 + line * 22
    while (x < width - 40 && r() > 0.02) {
      const glyph = 3 + Math.floor(r() * 7)
      const gh = 2 + Math.floor(r() * 10)
      fill(x, y, glyph, gh, ink)
      for (let k = -1; k <= gh; k++) {
        blend(x - 1, y + k, 0.2 + r() * 0.5)
        blend(x + glyph, y + k, 0.2 + r() * 0.5)
      }
      x += glyph + 2 + (r() > 0.85 ? 8 : 0)
    }
  }
  return img
}

/** 有透明區域的圖：中央不透明圓形，周圍全透明，邊緣半透明 */
export function transparent(width = 800, height = 600): RawImage {
  const img = blank(width, height, [0, 0, 0, 0])
  const cx = width / 2
  const cy = height / 2
  const rad = Math.min(width, height) * 0.35
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.hypot(x - cx, y - cy)
      const i = (y * width + x) * 4
      if (dist < rad + 2) {
        img.data[i] = 220
        img.data[i + 1] = 60
        img.data[i + 2] = 80
        img.data[i + 3] = dist < rad ? 255 : 128
      }
    }
  }
  return img
}

/** 最小的 GIF 位元組，frames 個 Image Descriptor */
export function gifBytes(frames: number): Uint8Array {
  const header = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // GIF89a
  const lsd = [1, 0, 1, 0, 0x80, 0, 0] // 1x1，全域色表 2 色
  const gct = [0, 0, 0, 255, 255, 255]
  const frame = [
    0x21,
    0xf9,
    4,
    0,
    10,
    0,
    0,
    0, // Graphic Control Extension
    0x2c,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    0,
    0, // Image Descriptor
    2,
    2,
    0x44,
    0x01,
    0, // 影像資料
  ]
  const out = [...header, ...lsd, ...gct]
  for (let f = 0; f < frames; f++) out.push(...frame)
  out.push(0x3b)
  return new Uint8Array(out)
}
