import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const dbDir = fileURLToPath(new URL("../src/server/db", import.meta.url));

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  for (const file of ["schema.sql", "seed.sql", "seed-songs.sql"]) {
    const sql = readFileSync(path.join(dbDir, file), "utf8");
    await client.query(sql);
    console.log(`Ran ${file}`);
  }
} finally {
  await client.end();
}
