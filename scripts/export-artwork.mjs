/** Export original React vectors and a count-aware contact sheet without an app build. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loadArtwork(name) {
  const source = fs.readFileSync(
    path.join(root, "packages/ui/src", name),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)(require, exports);
  return exports;
}
const { BadgeArt, BADGE_ART_DEFINITIONS } = loadArtwork("BadgeArt.tsx");
const { AvatarArt, AVATAR_OPTIONS } = loadArtwork("AvatarArt.tsx");
const collections = [
  {
    kind: "badges",
    heading: "Achievements, one meaningful step at a time.",
    size: 160,
    stride: 216,
    artworks: BADGE_ART_DEFINITIONS.map(({ key, name }) => ({
      key,
      name,
      element: React.createElement(BadgeArt, {
        badgeKey: key,
        name,
        size: 160,
      }),
    })),
  },
  {
    kind: "avatars",
    heading: "Choose a character. Make it yours.",
    size: 128,
    stride: 184,
    artworks: AVATAR_OPTIONS.map(({ key, name }) => ({
      key,
      name,
      element: React.createElement(AvatarArt, {
        avatarKey: key,
        label: name,
        size: 128,
      }),
    })),
  },
];
const width = 1000,
  padding = 48,
  columns = 4;
const columnWidth = (width - padding * 2) / columns;
const gallery = [];
let sectionY = 110;
for (const { kind, heading, size, stride, artworks } of collections) {
  const destination = path.join(root, "packages/ui/src/assets", kind);
  fs.mkdirSync(destination, { recursive: true });
  gallery.push(
    `<text x="${padding}" y="${sectionY}" font-size="22" font-weight="700">${heading}</text>`,
  );
  const artworkY = sectionY + 28;
  artworks.forEach(({ key, name, element }, index) => {
    const markup = renderToStaticMarkup(element, {
      identifierPrefix: `${kind}-${key}-`,
    });
    fs.writeFileSync(path.join(destination, `${key}.svg`), markup + "\n");
    const x =
      padding + (index % columns) * columnWidth + (columnWidth - size) / 2;
    const y = artworkY + Math.floor(index / columns) * stride;
    gallery.push(
      `<g data-artwork-kind="${kind}" data-artwork-key="${key}" transform="translate(${x} ${y})">${markup}<text x="${size / 2}" y="${size + 24}" text-anchor="middle">${name}</text></g>`,
    );
  });
  sectionY = artworkY + Math.ceil(artworks.length / columns) * stride + 30;
}
const height = sectionY + padding;
const title = `PixelVault: ${BADGE_ART_DEFINITIONS.length} achievements and ${AVATAR_OPTIONS.length} profile avatars`;
const catalog = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;height:auto" role="img" aria-labelledby="title"><title id="title">${title}</title><rect width="${width}" height="${height}" fill="#fff"/><g font-family="Manrope, sans-serif" fill="#0b1428" font-size="15"><text x="${padding}" y="48" font-size="25" font-weight="700">Your next chapter, illustrated.</text><text x="${padding}" y="76" fill="#52637b">${BADGE_ART_DEFINITIONS.length} original achievements · ${AVATAR_OPTIONS.length} optional profile characters</text>${gallery.join("")}</g></svg>\n`;
for (const destination of [
  "docs/brand/artwork-catalog.svg",
  "apps/web/public/illustrations/artwork-catalog.svg",
]) {
  fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
  fs.writeFileSync(path.join(root, destination), catalog);
}
console.log(
  `Exported ${BADGE_ART_DEFINITIONS.length} badge SVGs, ${AVATAR_OPTIONS.length} avatar SVGs and a ${width} × ${height} responsive artwork catalog.`,
);
