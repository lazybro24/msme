#!/usr/bin/env node
/**
 * Production entry for Railway.
 * Migrations are already applied on Neon — do not block boot on migrate.
 * Set RUN_MIGRATE_ON_START=true only when you intentionally need migrate deploy.
 */
const path = require("path");

if (process.env.RUN_MIGRATE_ON_START === "true") {
  const { spawnSync } = require("child_process");
  try {
    const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
      timeout: 45_000,
    });
    if (r.status !== 0) {
      console.warn("[start] migrate deploy exited", r.status, "— continuing");
    }
  } catch (err) {
    console.warn("[start] migrate deploy failed — continuing:", err);
  }
} else {
  console.log("[start] skipping migrate on boot (set RUN_MIGRATE_ON_START=true to enable)");
}

require(path.join(__dirname, "..", "dist", "index.js"));
