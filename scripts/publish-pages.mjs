import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const htmlPath = [path.join(dist, "index.html"), path.join(dist, "dev.html")].find((file) =>
  existsSync(file),
);
if (!htmlPath) throw new Error("O build não gerou index.html nem dev.html.");
const html = readFileSync(htmlPath, "utf8");

if (html.includes("/src/main.tsx")) {
  throw new Error("O index publicado ainda aponta para /src/main.tsx.");
}
if (!html.includes('src="/nina/assets/')) {
  throw new Error("O index publicado não carrega o bundle em /nina/assets/.");
}

writeFileSync(path.join(root, "index.html"), html);
rmSync(path.join(root, "assets"), { recursive: true, force: true });
cpSync(path.join(dist, "assets"), path.join(root, "assets"), { recursive: true });

const favicon = path.join(dist, "favicon.svg");
if (!existsSync(favicon)) throw new Error("favicon.svg não foi gerado no build.");
cpSync(favicon, path.join(root, "favicon.svg"));
writeFileSync(path.join(root, ".nojekyll"), "");

console.log("Site estático copiado para a raiz, no formato que o GitHub Pages da main publica.");
