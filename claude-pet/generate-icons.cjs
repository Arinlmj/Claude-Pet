const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { name: 'icon_16x16', size: 16 },
  { name: 'icon_16x16@2x', size: 32 },
  { name: 'icon_32x32', size: 32 },
  { name: 'icon_32x32@2x', size: 64 },
  { name: 'icon_128x128', size: 128 },
  { name: 'icon_128x128@2x', size: 256 },
  { name: 'icon_256x256', size: 256 },
  { name: 'icon_256x256@2x', size: 512 },
  { name: 'icon_512x512', size: 512 },
  { name: 'icon_512x512@2x', size: 1024 },
];

const OUT_DIR = path.join(__dirname, 'src-tauri', 'icons', 'icon.iconset');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generateClaudeIcon(size, filename) {
  const s = size;
  const r = s * 0.22;

  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2a2a3e;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#1e1e2e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#18181b;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${s * 0.04}" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Dark rounded background -->
    <rect x="0" y="0" width="${s}" height="${s}" rx="${r}" ry="${r}" fill="url(#bgGrad)"/>

    <!-- Purple gradient border -->
    <rect x="${s * 0.03}" y="${s * 0.03}" width="${s * 0.94}" height="${s * 0.94}" rx="${r * 0.85}" ry="${r * 0.85}"
          fill="none" stroke="url(#accentGrad)" stroke-width="${s * 0.05}"/>

    <!-- Large sparkle ✨ - white for visibility -->
    <text x="${s/2}" y="${s/2 - s * 0.02}"
          font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif"
          font-size="${s * 0.4}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          filter="url(#glow)">✨</text>

    <!-- Pet emoji - white -->
    <text x="${s * 0.72}" y="${s * 0.72}"
          font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif"
          font-size="${s * 0.24}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white">🐰</text>

    <!-- Small sparkle - white -->
    <text x="${s * 0.28}" y="${s * 0.68}"
          font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif"
          font-size="${s * 0.14}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white">✨</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`Generated: ${filename}`);
}

async function main() {
  console.log('Generating Claude Code-styled icons (white emoji)...\n');

  for (const { name, size } of SIZES) {
    await generateClaudeIcon(size, `${name}.png`);
  }

  console.log('\n✅ Claude Code-styled icons generated!');
  console.log('\nTo convert to .icns, run:');
  console.log('cd src-tauri/icons && iconutil --convert icns icon.iconset');
}

main().catch(console.error);
