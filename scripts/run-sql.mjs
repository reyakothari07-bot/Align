// Runs SQL files in order, in one session. Usage: node scripts/run-sql.mjs file1.sql [file2.sql ...]
import { readFile } from "node:fs/promises";
import { connect } from "./db.mjs";

const files = process.argv.slice(2);
const client = await connect();
try {
  for (const file of files) {
    process.stdout.write(`Running ${file} … `);
    await client.query(await readFile(file, "utf8"));
    console.log("done");
  }
} catch (err) {
  console.log("FAILED");
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
