/** Copy pinned local assets. This is an asset copy, not an application build. */
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = join(root, 'apps/api/config/static/api-docs');
await mkdir(target, {recursive: true});
const bundle = join(root, 'node_modules/@scalar/api-reference/dist/browser/standalone.js');
await copyFile(bundle, join(target, 'reference.js'));
await copyFile(join(root, 'node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2'), join(target, 'manrope.woff2'));
const brand = join(root, 'packages/ui/src/assets/brand');
const names = await readdir(brand);
const logo = names.find(name => /glyph.*\.svg$/.test(name)) || names.find(name => /logo.*\.svg$/.test(name));
if (!logo) throw new Error('PixelVault brand glyph was not found.');
await copyFile(join(brand, logo), join(target, 'logo.svg'));
console.log('Copied pinned Scalar, local Manrope and PixelVault logo.');
