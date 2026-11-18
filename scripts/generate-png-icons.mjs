import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal CRC32 implementation for PNG chunks
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateBadgePng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width, height, bit depth (8), color type (6 = RGBA), compression (0), filter (0), interlace (0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte (0) per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = x / width;
      const ny = y / height;

      // Base background: Dark Slate (#020617)
      let r = 2;
      let g = 6;
      let b = 23;
      let a = 255;

      // Court Inner Border (Emerald #10b981)
      const borderWidth = 0.04;
      const inBox = nx >= 0.18 && nx <= 0.82 && ny >= 0.18 && ny <= 0.82;
      const onBorder =
        (Math.abs(nx - 0.18) < borderWidth / 2 ||
          Math.abs(nx - 0.82) < borderWidth / 2 ||
          Math.abs(ny - 0.18) < borderWidth / 2 ||
          Math.abs(ny - 0.82) < borderWidth / 2) &&
        nx >= 0.18 &&
        nx <= 0.82 &&
        ny >= 0.18 &&
        ny <= 0.82;

      // Net Line at center (Y = 0.50)
      const onNet = Math.abs(ny - 0.5) < 0.02 && nx >= 0.18 && nx <= 0.82;
      // Center Line (X = 0.50)
      const onCenterLine = Math.abs(nx - 0.5) < 0.015 && inBox;

      if (onBorder || onNet || onCenterLine) {
        r = 16;
        g = 185;
        b = 129;
      }

      // Parabolic Trajectory Arc (Sky Blue #38bdf8 to Emerald #10b981)
      const arcY = 0.8 - 1.2 * (nx - 0.2) * (0.8 - nx);
      if (Math.abs(ny - arcY) < 0.025 && nx >= 0.2 && nx <= 0.78) {
        r = 56;
        g = 189;
        b = 248;
      }

      // Shuttlecock Impact Point (Gold #f59e0b)
      const distToImpact = Math.hypot(nx - 0.76, ny - 0.74);
      if (distToImpact < 0.05) {
        r = 245;
        g = 158;
        b = 11;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pwa192 = generateBadgePng(192, 192);
const pwa512 = generateBadgePng(512, 512);
const ogImage = generateBadgePng(1200, 630);

fs.writeFileSync(path.resolve('public', 'pwa-192x192.png'), pwa192);
fs.writeFileSync(path.resolve('public', 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.resolve('public', 'maskable-icon-512x512.png'), pwa512);
fs.writeFileSync(path.resolve('public', 'apple-touch-icon.png'), pwa192);
fs.writeFileSync(path.resolve('public', 'favicon.ico'), pwa192);
fs.writeFileSync(path.resolve('public', 'og-image.png'), ogImage);

console.log('Successfully generated crisp 192x192, 512x512, maskable, apple-touch-icon, and 1200x630 og-image.png!');
