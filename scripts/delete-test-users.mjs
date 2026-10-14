// Deletes test accounts by phone number, plus everything they created
// (campaigns, requests, deals, chats, reviews, notifications).
//
//   node --env-file=.env.local scripts/delete-test-users.mjs 919100000003 919100000004          # dry run
//   node --env-file=.env.local scripts/delete-test-users.mjs 919100000003 919100000004 --yes    # delete
//
// Uploaded portfolio files are not removed here (Supabase only allows that
// through the Storage API); the script lists any it finds.
import { connect } from "./db.mjs";

const args = process.argv.slice(2);
const confirm = args.includes("--yes");
const phones = args.filter((a) => a !== "--yes").map((p) => p.replace(/\D/g, ""));
if (!phones.length) {
  console.error("Pass one or more phone numbers, e.g. 919100000003");
  process.exit(1);
}

const c = await connect();
const { rows: users } = await c.query(
  `select u.id, a.phone, u.name, u.role, coalesce(b.brand_name, '') as brand
     from auth.users a join public.users u on u.id = a.id
     left join public.brand_profiles b on b.user_id = u.id
    where a.phone = any($1)`,
  [phones],
);
if (!users.length) {
  console.log("No accounts found for", phones.join(", "));
  await c.end();
  process.exit(0);
}
const ids = users.map((u) => u.id);
console.table(users.map(({ phone, name, role, brand }) => ({ phone, name, role, brand })));

const count = async (sql) => Number((await c.query(sql, [ids])).rows[0].n);
const dealIds = `select id from public.deals where brand_id = any($1) or creator_id = any($1)`;
console.log({
  campaigns: await count(`select count(*) n from public.campaigns where brand_id = any($1)`),
  requests: await count(`select count(*) n from public.requests where brand_id = any($1) or creator_id = any($1)`),
  deals: await count(`select count(*) n from public.deals where brand_id = any($1) or creator_id = any($1)`),
  messages: await count(`select count(*) n from public.messages where deal_id in (${dealIds}) or sender_id = any($1)`),
  reviews: await count(`select count(*) n from public.reviews where deal_id in (${dealIds}) or reviewer_id = any($1) or reviewee_id = any($1)`),
  portfolio_files: await count(`select count(*) n from storage.objects where bucket_id = 'portfolio' and (storage.foldername(name))[1] = any($1::text[])`),
});

if (!confirm) {
  console.log("\nDry run. Add --yes to delete these accounts and everything above.");
  await c.end();
  process.exit(0);
}

await c.query("begin");
try {
  await c.query(`delete from public.reviews where deal_id in (${dealIds}) or reviewer_id = any($1) or reviewee_id = any($1)`, [ids]);
  await c.query(`delete from public.messages where deal_id in (${dealIds}) or sender_id = any($1)`, [ids]);
  await c.query(`delete from public.notifications where user_id = any($1) or deal_id in (${dealIds})`, [ids]);
  await c.query(`delete from public.deals where brand_id = any($1) or creator_id = any($1)`, [ids]);
  await c.query(`delete from public.requests where brand_id = any($1) or creator_id = any($1) or initiated_by = any($1) or countered_by = any($1)`, [ids]);
  await c.query(`delete from public.campaigns where brand_id = any($1)`, [ids]);
  // Other brands' campaigns may have had slots filled by these users.
  await c.query(`update public.campaigns c set slots_filled =
                   (select count(*) from public.deals d join public.requests r on r.id = d.request_id where r.campaign_id = c.id)`);
  await c.query(`delete from auth.users where id = any($1)`, [ids]); // cascades to users, user_private, profiles
  await c.query("commit");
  console.log(`\nDeleted ${ids.length} account(s) and their data.`);
} catch (err) {
  await c.query("rollback");
  console.error("Nothing deleted:", err.message);
  process.exitCode = 1;
}
await c.end();
