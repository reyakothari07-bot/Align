// Exports all app data (auth users + public tables) as SQL that recreates it in another
// project with the same schema. Triggers fire on insert there, so the script upserts the
// rows triggers create and replaces generated notifications at the end.
//   node --env-file=.env.local scripts/export-data.mjs > /tmp/align-data.sql
import { connect } from "./db.mjs";

const TABLES = [
  ["auth", "users"],
  ["auth", "identities"],
  ["public", "users"],
  ["public", "user_private"],
  ["public", "creator_profiles"],
  ["public", "brand_profiles"],
  ["public", "admin_emails"],
  ["public", "campaigns"],
  ["public", "requests"],
  ["public", "deals"],
  ["public", "messages"],
  ["public", "reviews"],
  ["public", "notifications"],
];
// Rows created by triggers in the target (users/user_private from the auth trigger) must be overwritten.
const UPSERT_KEY = { "public.users": "id", "public.user_private": "user_id", "public.admin_emails": "email" };

const c = await connect();
const out = [];
for (const [schema, table] of TABLES) {
  const cols = (
    await c.query(
      `select column_name from information_schema.columns
        where table_schema = $1 and table_name = $2 and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS'
        order by ordinal_position`,
      [schema, table],
    )
  ).rows.map((r) => `"${r.column_name}"`);
  const rows = (await c.query(`select ${cols.join(", ")} from ${schema}.${table}`)).rows;
  const full = `${schema}.${table}`;
  if (full === "public.notifications") out.push("delete from public.notifications;");
  if (!rows.length) continue;
  const json = JSON.stringify(rows).replace(/'/g, "''");
  const key = UPSERT_KEY[full];
  const conflict = key
    ? ` on conflict ("${key}") do update set ${cols.filter((x) => x !== `"${key}"`).map((x) => `${x} = excluded.${x}`).join(", ")}`
    : "";
  out.push(`insert into ${full} (${cols.join(", ")}) select ${cols.join(", ")} from json_populate_recordset(null::${full}, '${json}')${conflict};`);
  console.error(`${full}: ${rows.length} rows`);
}
await c.end();
process.stdout.write(out.join("\n\n") + "\n");
