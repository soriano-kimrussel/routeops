import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Tests run against their own SQLite file so they never touch dev.db.
const testDbUrl = `file:${path.join(root, "prisma", "test.db").replace(/\\/g, "/")}`;

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: testDbUrl },
    fileParallelism: false,
  },
});
