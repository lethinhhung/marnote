import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react() as unknown as Plugin],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@tiptap/pm/")) return "prosemirror";
          if (id.includes("/node_modules/@tiptap/core/")) return "tiptap-core";
          if (id.includes("/node_modules/@tiptap/")) return "tiptap";
          if (id.includes("/node_modules/prosemirror-")) return "prosemirror";
        },
      },
    },
  },
});
