import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(__dirname, "src"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@renderer": path.join(__dirname, "src"),
      "@supermuschel/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@supermuschel/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
  build: {
    outDir: path.join(__dirname, "out/web-renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, "src/index.html"),
    },
  },
});
