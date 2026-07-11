import path from "node:path";
import { defineConfig } from "vitest/config";

// Espelha o alias "@/*" -> "./src/*" já definido em tsconfig.json, para que
// imports em runtime (não só type-only) resolvam durante os testes.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
