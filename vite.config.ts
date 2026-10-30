import { defineConfig } from "vite";

// Built into docs/ so GitHub Pages can serve it from the main branch.
export default defineConfig({
  base: "./",
  build: { outDir: "docs", emptyOutDir: true },
});
