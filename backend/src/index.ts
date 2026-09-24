import "dotenv/config";
import { createApp } from "./app";
import { bootstrapAdminFromEnv } from "./lib/bootstrapAdmin";

const port = Number(process.env.PORT || 4000);

async function main() {
  try {
    await bootstrapAdminFromEnv();
  } catch (err) {
    console.error("[bootstrap] Failed:", err);
  }

  const app = createApp();
  app.listen(port, () => {
    console.log(`Mysuru MSME Awards API listening on http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/api/health`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
