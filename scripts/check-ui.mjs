import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const canonical = path.resolve("packages/ui/src/components/ui");
const forbidden = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
]);
export function checkSource(file, source) {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const errors = [];
  if (!path.resolve(file).startsWith(canonical + path.sep)) {
    function visit(node) {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        forbidden.has(node.tagName.getText(parsed))
      ) {
        const pos = parsed.getLineAndCharacterOfPosition(node.getStart());
        errors.push(
          `${file}:${pos.line + 1}: raw <${node.tagName.getText(parsed)}> belongs in the canonical UI layer`,
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }
  return errors;
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : /\.tsx$/.test(e.name)
          ? [path.join(dir, e.name)]
          : [],
    );
}
const files = ["apps/web/src", "packages/ui/src"].flatMap((dir) =>
  fs.existsSync(dir) ? walk(dir) : [],
);
const errors = files.flatMap((f) => checkSource(f, fs.readFileSync(f, "utf8")));
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;
else
  console.log(
    `UI boundary checked: ${files.length} TSX modules; canonical Shadcn controls enforced.`,
  );

if (
  checkSource(
    "apps/web/src/Feature.tsx",
    "const View=()=> <button>Raw</button>",
  ).length !== 1
)
  throw new Error("UI boundary negative fixture failed");
if (
  checkSource(
    "packages/ui/src/components/ui/example.tsx",
    "const View=()=> <button>Canonical</button>",
  ).length !== 0
)
  throw new Error("UI boundary canonical fixture failed");
if (
  checkSource(
    "apps/web/src/Feature.tsx",
    "const View=()=> <Button>Shared</Button>",
  ).length !== 0
)
  throw new Error("UI boundary shared-control fixture failed");
