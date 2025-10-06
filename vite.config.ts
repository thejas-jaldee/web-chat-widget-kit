// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // ⬇️ Add this block
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": {},   // guards any other process.env access
    global: "window",    // some libs check for `global`
  },
  build: {
    lib: {
      entry: "src/sdk.tsx",
      name: "LeadSDK",     // global for IIFE build
      formats: ["iife"],
      fileName: () => "leadsdk.js",
    },
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
    minify: "esbuild",
    target: "es2018",
    sourcemap: false,
  },
});
