#!/usr/bin/env node
/**
 * Production entry: migrate (best-effort), then run the API as PID-stable Node.
 * Avoids `sh -c` / npm wrapper issues that can confuse Railway's process supervisor.
 */
const { spawnSync } = require("child_process");
const path = require("path");

try {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.warn("[start] migrate deploy exited", r.status, "— continuing");
  }
} catch (err) {
  console.warn("[start] migrate deploy failed — continuing:", err);
}

require(path.join(__dirname, "..", "dist", "index.js"));
