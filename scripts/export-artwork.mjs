/** Export the original React vector artwork as portable SVG assets, without an app build. */
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
const { BadgeArt, BADGE_ART_KEYS } = loadArtwork("BadgeArt.tsx");
const { AvatarArt, AVATAR_OPTIONS } = loadArtwork("AvatarArt.tsx");
const badgeNames = [
  "First Chapter",
  "Clockwork",
  "Full Circle",
  "Open Book",
  "Helping Hand",
  "Fresh Start",
];
const collections = [
  [
    "badges",
    BADGE_ART_KEYS.map((key, index) => ({
      key,
      name: badgeNames[index],
      element: React.createElement(BadgeArt, {
        badgeKey: key,
        name: badgeNames[index],
        size: 160,
      }),
    })),
  ],
  [
    "avatars",
    AVATAR_OPTIONS.map(({ key, name }) => ({
      key,
      name,
      element: React.createElement(AvatarArt, {
        avatarKey: key,
        label: name,
        size: 128,
      }),
    })),
  ],
];
const gallery = [];
for (const [kind, artworks] of collections) {
  const destination = path.join(root, "packages/ui/src/assets", kind);
  fs.mkdirSync(destination, { recursive: true });
  artworks.forEach(({ key, name, element }, index) => {
    const markup = renderToStaticMarkup(element, {
      identifierPrefix: `${kind}-${key}-`,
    });
    fs.writeFileSync(path.join(destination, `${key}.svg`), markup + "\n");
    const column = index % (kind === "badges" ? 3 : 4);
    const row = Math.floor(index / (kind === "badges" ? 3 : 4));
    const x = kind === "badges" ? 72 + column * 300 : 48 + column * 235;
    const y = (kind === "badges" ? 78 : 530) + row * 192;
    gallery.push(
      `<g transform="translate(${x} ${y})">${markup}<text x="${kind === "badges" ? 80 : 64}" y="${kind === "badges" ? 178 : 148}" text-anchor="middle">${name}</text></g>`,
    );
  });
}
const catalog = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="940" viewBox="0 0 1000 940" role="img" aria-labelledby="title"><title id="title">PixelVault: six achievements and eight profile avatars</title><rect width="1000" height="940" fill="#fff"/><g font-family="Manrope, sans-serif" fill="#0b1428" font-size="15"><text x="48" y="42" font-size="25" font-weight="700">Your next chapter, illustrated.</text><text x="48" y="498" font-size="23" font-weight="700">Choose a character. Make it yours.</text>${gallery.join("")}</g></svg>\n`;
for (const destination of [
  "docs/brand/artwork-catalog.svg",
  "apps/web/public/illustrations/artwork-catalog.svg",
]) {
  fs.writeFileSync(path.join(root, destination), catalog);
}
console.log(
  "Exported six badge SVGs, eight avatar SVGs and docs/brand/artwork-catalog.svg.",
);
