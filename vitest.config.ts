import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // `server-only` は Node/vitest 環境では例外を投げるため空モジュールに差し替える
      "server-only": path.resolve(__dirname, "./test/empty.ts"),
    },
  },
});
