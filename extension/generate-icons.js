// Generate placeholder icons for the Chrome extension
// Run: node extension/generate-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ------------------------------------------------------------------
   PNG writer — proper CRC32 so Chrome accepts the files.
   ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/* ------------------------------------------------------------------
   Icon drawing
   - RGBA so we get transparent rounded corners
   - Mustard (#E8B931) background with a dark charcoal (#070A12) "Q"
   ------------------------------------------------------------------ */
const MUSTARD = [232, 185, 49];
const CHARCOAL = [7, 10, 18];

function inRoundedRect(x, y, size, radius) {
  const r = radius * size;
  if (x >= r && x <= size - r) return true;
  if (y >= r && y <= size - r) return true;
  const dx = Math.max(r - x, 0, x - (size - r));
  const dy = Math.max(r - y, 0, y - (size - r));
  return dx * dx + dy * dy <= r * r;
}

function inQShape(x, y, size) {
  const cx = x / size - 0.5;
  const cy = y / size - 0.5;
  const d = Math.sqrt(cx * cx + cy * cy);
  // Ring of the Q
  const ring = d > 0.2 && d < 0.42;
  // Diagonal tail extending bottom-right
  const angle = Math.atan2(cy, cx); // -PI..PI
  const deg = (angle * 180) / Math.PI;
  const tail = deg > 15 && deg < 60 && d > 0.42 && d < 0.62;
  return ring || tail;
}

function createPNG(size, r, g, b) {
  const width = size;
  const height = size;
  const cornerRadius = 0.2; // 20% for rounded-corner look

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type (RGBA)
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Image data: each row starts with filter byte 0, then RGBA pixels
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      if (!inRoundedRect(x + 0.5, y + 0.5, size, cornerRadius)) {
        // Transparent outside the rounded corner
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
      } else if (inQShape(x + 0.5, y + 0.5, size)) {
        // Dark "Q" letter
        rawData[offset] = CHARCOAL[0];
        rawData[offset + 1] = CHARCOAL[1];
        rawData[offset + 2] = CHARCOAL[2];
        rawData[offset + 3] = 255;
      } else {
        // Mustard background
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
        rawData[offset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Mustard yellow: #E8B931 = rgb(232, 185, 49)
[16, 48, 128].forEach(size => {
  const png = createPNG(size, 232, 185, 49);
  const filepath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filepath, png);
  console.log(`Created ${filepath} (${png.length} bytes)`);
});

console.log('Done! Icons generated in extension/icons/');
