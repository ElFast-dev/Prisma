import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const ASSETS = join(DIST, "assets");
const BUDGETS_KIB = {
  initialJavaScript: 150,
  initialCss: 25,
  lazyChunk: 45
};

function kib(bytes) {
  return bytes / 1024;
}

function sizeLabel(bytes) {
  return kib(bytes).toFixed(2) + " KiB";
}

function assetName(reference) {
  return basename(new URL(reference, "https://prisma.invalid").pathname);
}

const html = await readFile(join(DIST, "index.html"), "utf8");
const scriptReference = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/i)?.[1];
const cssReference = html.match(/<link\b[^>]*\bhref="([^"]+\.css)"/i)?.[1];

if (!scriptReference || !cssReference) {
  throw new Error("No se pudieron identificar los recursos iniciales en dist/index.html.");
}

const files = (await readdir(ASSETS)).filter((name) => name.endsWith(".js") || name.endsWith(".css"));
const measurements = await Promise.all(files.map(async (name) => {
  const content = await readFile(join(ASSETS, name));
  return { name, bytes: content.byteLength, gzipBytes: gzipSync(content).byteLength };
}));
const byName = new Map(measurements.map((item) => [item.name, item]));
const initialJs = byName.get(assetName(scriptReference));
const initialCss = byName.get(assetName(cssReference));

if (!initialJs || !initialCss) {
  throw new Error("No se encontraron los archivos iniciales dentro de dist/assets.");
}

const lazyChunks = measurements
  .filter((item) => item.name.endsWith(".js") && item.name !== initialJs.name)
  .sort((a, b) => b.gzipBytes - a.gzipBytes);
const largestLazy = lazyChunks[0];

console.log("Presupuesto de recursos de Prisma (tamaños comprimidos con gzip)");
console.log("JavaScript inicial: " + sizeLabel(initialJs.gzipBytes) + " / " + BUDGETS_KIB.initialJavaScript + " KiB");
console.log("CSS inicial: " + sizeLabel(initialCss.gzipBytes) + " / " + BUDGETS_KIB.initialCss + " KiB");
console.log("Mayor chunk diferido: " + (largestLazy ? largestLazy.name + " · " + sizeLabel(largestLazy.gzipBytes) : "ninguno") + " / " + BUDGETS_KIB.lazyChunk + " KiB");
console.log("Chunks JavaScript diferidos: " + lazyChunks.length);

const checks = [
  { label: "JavaScript inicial", actual: kib(initialJs.gzipBytes), limit: BUDGETS_KIB.initialJavaScript },
  { label: "CSS inicial", actual: kib(initialCss.gzipBytes), limit: BUDGETS_KIB.initialCss },
  { label: "Mayor chunk diferido", actual: largestLazy ? kib(largestLazy.gzipBytes) : 0, limit: BUDGETS_KIB.lazyChunk, name: largestLazy?.name }
];

for (const check of checks) {
  if (check.actual > check.limit) {
    const detail = check.label + (check.name ? " (" + check.name + ")" : "") + " supera " + check.limit + " KiB: " + check.actual.toFixed(2) + " KiB."; 
    console.log("::warning title=Presupuesto de rendimiento::" + detail);
  }
}
