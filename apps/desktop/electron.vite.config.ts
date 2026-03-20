import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.resolve(__dirname, "electron/index.ts"),
      },
    },
    resolve: {
      alias: {
        "@main": path.resolve(__dirname, "electron"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: path.resolve(__dirname, "electron/preload.ts"),
      },
    },
  },
  renderer: {
    root: path.resolve(__dirname, "src"),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@renderer": path.resolve(__dirname, "src"),
      },
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, "src/index.html"),
      },
    },
  },
});
