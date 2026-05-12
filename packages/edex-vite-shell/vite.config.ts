import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname),
  publicDir: "public",
  server: {
    port: 5174,
    strictPort: false,
  },
  resolve: {
    alias: {
      "#": path.resolve(import.meta.dirname, "src"),
    },
  },
});
