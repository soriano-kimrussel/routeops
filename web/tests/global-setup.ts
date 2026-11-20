import { execSync } from "child_process";
import { rmSync } from "fs";
import path from "path";

/** Build a fresh test database from the real migrations before the suite runs. */
export default function setup() {
  const root = path.resolve(__dirname, "..");
  const dbFile = path.join(root, "prisma", "test.db");
  rmSync(dbFile, { force: true });
  rmSync(`${dbFile}-journal`, { force: true });

  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: `file:${dbFile.replace(/\\/g, "/")}` },
  });
}
