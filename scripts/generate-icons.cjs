const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create public directory
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg with Spotify-style Green & Black aesthetic
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#181818" />
      <stop offset="100%" stop-color="#121212" />
    </linearGradient>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1ed760" />
      <stop offset="100%" stop-color="#1db954" />
    </linearGradient>
  </defs>
  <!-- Background with Spotify-like dark squircle -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="124" fill="none" stroke="#282828" stroke-width="4" />
  
  <!-- Stylized vinyl / sound waves -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#282828" stroke-width="4" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="#333333" stroke-width="3" />
  <circle cx="256" cy="256" r="100" fill="none" stroke="#1db954" stroke-width="3" opacity="0.8" />
  
  <!-- Center Spotify Green Play Node -->
  <circle cx="256" cy="256" r="64" fill="url(#greenGrad)" />
  
  <!-- Play & audio note symbol in crisp black & white -->
  <path d="M242 224 L278 256 L242 288 Z" fill="#000000" />
  <circle cx="202" cy="285" r="12" fill="#1ed760" opacity="0.9" />
  <path d="M214 285 L214 232 C214 227 220 222 227 222 L240 222" stroke="#1ed760" stroke-width="5" fill="none" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent.trim());
console.log('Created icon.svg');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rawBytes = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const rBg = isMaskable ? width / 2 : width * 0.44;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 18, g = 18, b = 18, a = 255; // Spotify dark background (#121212)

      if (dist > rBg && !isMaskable) {
        a = 0;
      } else {
        const r1 = width * 0.35;
        const r2 = width * 0.27;
        const r3 = width * 0.18;
        const rCenter = width * 0.13;

        if (Math.abs(dist - r1) < 2) {
          r = 40; g = 40; b = 40;
        } else if (Math.abs(dist - r2) < 2) {
          r = 55; g = 55; b = 55;
        } else if (Math.abs(dist - r3) < 2.5) {
          r = 29; g = 185; b = 84; // Spotify Green #1db954
        } else if (dist <= rCenter) {
          // Inner glowing Spotify green play disc (#1ed760)
          r = 30;
          g = 215;
          b = 96;

          // Draw small triangle play icon in black inside center
          const px = (dx / rCenter);
          const py = (dy / rCenter);
          if (px >= -0.2 && px <= 0.35 && Math.abs(py) <= (0.35 - px * 0.5) * 0.8) {
            r = 0; g = 0; b = 0;
          }
        }
      }

      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawBytes);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNGs
const pwa192 = createPng(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const pwa512 = createPng(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

const pwaMaskable = createPng(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

const appleTouch = createPng(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('Regenerated all PWA icons with Spotify Green theme');
