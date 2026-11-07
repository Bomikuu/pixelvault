/** Explicit existing public artwork delivery; no image generation and no app build. */
import {readFile, copyFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'scripts/mobile-assets.json'), 'utf8'));
const target = join(root, 'apps/mobile/public');
await mkdir(join(target, 'illustrations'), {recursive: true});
await mkdir(join(target, 'brand'), {recursive: true});
for (const scene of manifest.scenes) for (const width of manifest.widths) await copyFile(join(root, `apps/web/public/illustrations/${scene}-${width}.webp`), join(target, `illustrations/${scene}-${width}.webp`));
await copyFile(join(root, 'packages/ui/src/assets/brand/pixelvault-glyph.svg'), join(target, 'brand/pixelvault-glyph.svg'));
console.log('Synced the selected original PixelVault artwork for mobile.');
