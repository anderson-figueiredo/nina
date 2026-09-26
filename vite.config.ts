import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

function pagesEntry(): Plugin {
  return {
    name: "nina-pages-entry",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        const pathOnly = url.split("?")[0];
        if (pathOnly === "/" || pathOnly === "/index.html") {
          const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
          req.url = `/dev.html${query}`;
        }
        next();
      });
    },
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["dev.html"];
      if (html && html.type === "asset") {
        bundle["index.html"] = { ...html, fileName: "index.html" };
        delete bundle["dev.html"];
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  // GitHub Pages do projeto: https://anderson-figueiredo.github.io/nina/
  base: process.env.VITE_BASE_PATH ?? (command === "build" ? "/nina/" : "/"),
  plugins: [pagesEntry(), react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
  build: {
    rollupOptions: {
      input: { index: path.resolve(root, "dev.html") },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
}));
