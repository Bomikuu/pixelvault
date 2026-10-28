import fs from "node:fs";
const source = fs.readFileSync("packages/ui/src/styles/tokens.css", "utf8");
const colors = Object.fromEntries(
  [...source.matchAll(/--([a-z-]+):\s*(#[a-fA-F0-9]{6})/g)].map((m) => [
    m[1],
    m[2],
  ]),
);
const luminance = (hex) => {
  const rgb = hex
    .match(/[a-f\d]{2}/gi)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const pairs = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["primary-foreground", "primary"],
  ["success", "success-background"],
  ["warning", "warning-background"],
  ["destructive", "danger-background"],
  ["dark-foreground", "dark-background"],
  ["dark-muted", "dark-background"],
  ["dark-link", "dark-background"],
];
let failures = 0;
for (const [fg, bg] of pairs) {
  if (!colors[fg] || !colors[bg])
    throw new Error(`Missing semantic token ${fg}/${bg}`);
  const values = [luminance(colors[fg]), luminance(colors[bg])].sort(
    (a, b) => b - a,
  );
  const ratio = (values[0] + 0.05) / (values[1] + 0.05);
  console.log(`${fg} / ${bg}: ${ratio.toFixed(2)}:1`);
  if (ratio < 4.5) failures++;
}
if (failures) process.exitCode = 1;
