require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const crypto = require("crypto");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 20000,
  });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  const name = "20260923120000_init";
  const exists = await c.query(
    "SELECT 1 FROM _prisma_migrations WHERE migration_name=$1",
    [name]
  );
  if (!exists.rowCount) {
    const sql = fs.readFileSync(
      "prisma/migrations/20260923120000_init/migration.sql",
      "utf8"
    );
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    await c.query(
      `INSERT INTO _prisma_migrations
        (id, checksum, finished_at, migration_name, applied_steps_count)
       VALUES ($1, $2, now(), $3, 1)`,
      [crypto.randomUUID(), checksum, name]
    );
    console.log("baselined", name);
  } else {
    console.log("already baselined");
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
