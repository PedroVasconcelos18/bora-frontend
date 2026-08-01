// Gera os PNGs de ícone/badge da PWA a partir das fontes SVG em public/icons/.
//
// Roda uma vez em dev (npm run icons), não faz parte do build: os PNGs são
// artefatos comitados, não algo a regenerar a cada deploy no Vercel — rodar uma
// lib nativa de imagem em todo build é uma superfície de falha desnecessária.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const iconsDir = resolve(publicDir, 'icons');

// Todas as fontes SVG usam viewBox="0 0 64 64" — a densidade é calculada por
// alvo para que o sharp rasterize direto na resolução final, em vez de
// renderizar a 64px e ampliar (o que borraria os traços do "B").
const SOURCE_VIEWBOX_SIZE = 64;
const BASE_DENSITY = 72;

const targets = [
  {
    src: resolve(publicDir, 'favicon.svg'),
    out: resolve(iconsDir, 'icon-192.png'),
    size: 192,
  },
  {
    src: resolve(iconsDir, 'icon-maskable-source.svg'),
    out: resolve(iconsDir, 'icon-512.png'),
    size: 512,
  },
  {
    src: resolve(iconsDir, 'badge-source.svg'),
    out: resolve(iconsDir, 'badge-96.png'),
    size: 96,
  },
];

for (const { src, out, size } of targets) {
  if (!existsSync(src)) {
    throw new Error(`generate-icons: fonte não encontrada — ${src}`);
  }
  const density = Math.round((size / SOURCE_VIEWBOX_SIZE) * BASE_DENSITY);
  await sharp(src, { density })
    .resize(size, size)
    .png()
    .toFile(out);
}

console.log(
  `generate-icons: ${targets.length} PNGs gerados em public/icons/ (${targets
    .map((t) => `${t.size}x${t.size}`)
    .join(', ')}), alfa preservado`
);
