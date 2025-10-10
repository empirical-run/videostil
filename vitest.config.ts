import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
    environment: "node",
    testTimeout: 30000, // 30 seconds for video processing tests
  },
});
