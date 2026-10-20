import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Resolve the "@/..." alias used across src/ so tests can import the same
// module specifiers the source files use.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
})
