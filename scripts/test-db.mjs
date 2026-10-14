// Runs the pgTAP suite against the database in DATABASE_URL. The suite rolls back, so no data changes.
import { readFile } from "node:fs/promises";
import { connect } from "./db.mjs";

const client = await connect();
let failed = 0;
try {
  const results = await client.query(await readFile("supabase/tests/align_rules.test.sql", "utf8"));
  for (const r of [results].flat()) {
    for (const row of r.rows ?? []) {
      for (const v of Object.values(row)) {
        if (typeof v !== "string" || !/^(ok|not ok|#|1\.\.)/.test(v)) continue;
        console.log(v);
        if (v.startsWith("not ok") || v.startsWith("# Looks like you planned")) failed++;
      }
    }
  }
} catch (err) {
  console.error(err.message);
  failed++;
} finally {
  await client.end();
}
console.log(failed ? `\n${failed} failing` : "\nAll database tests passed.");
process.exit(failed ? 1 : 0);
