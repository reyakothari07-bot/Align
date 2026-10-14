// End-to-end privacy check through the public API (what the browser can reach).
// Signs in as a seeded creator and a seeded brand, reads every table/view the app
// exposes, and fails if any response contains another user's phone or email.
//
// Needs: the seed loaded, and test phone numbers configured in Supabase
// (Auth → Providers → Phone → test OTPs): 919000000001=123456, 919000000011=123456
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SOURCES = {
  users: "id, role, name, created_at, suspended",
  user_private: "*",
  creator_profiles: "*",
  brand_profiles: "*",
  campaigns: "*",
  requests: "*",
  deals: "*",
  messages: "*",
  reviews: "*",
  notifications: "*",
  creator_cards: "*",
  brand_cards: "*",
  campaign_cards: "*",
  request_cards: "*",
  deal_cards: "*",
  user_ratings: "*",
};

let failures = 0;
const fail = (msg) => (failures++, console.log("  ✗ " + msg));

for (const phone of ["+919000000001", "+919000000011"]) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth, error } = await supabase.auth.verifyOtp({ phone, token: "123456", type: "sms" });
  if (error) {
    console.error(`Could not sign in as ${phone}: ${error.message}`);
    process.exit(1);
  }
  const me = auth.user.id;
  const { data: mine } = await supabase.from("user_private").select("phone, email").single();
  console.log(`Signed in as ${phone} (${mine.email})`);

  // Every seeded phone/email except the viewer's own.
  const others = [];
  for (let i = 1; i <= 15; i++) {
    const p = "9190000000" + String(i).padStart(2, "0");
    if (p !== mine.phone) others.push(p);
  }
  for (const [table, cols] of Object.entries(SOURCES)) {
    const { data, error } = await supabase.from(table).select(cols).limit(1000);
    if (error) {
      fail(`${table}: ${error.message}`);
      continue;
    }
    const text = JSON.stringify(data);
    const leakedPhone = others.find((p) => text.includes(p) || text.includes(p.slice(2)));
    const emails = (text.match(/[\w.+-]+@example\.com/g) ?? []).filter((e) => e !== mine.email);
    if (leakedPhone) fail(`${table} contains another user's phone`);
    else if (emails.length) fail(`${table} contains another user's email (${emails[0]})`);
    else if (table === "user_private" && (data.length !== 1 || data[0].user_id !== me)) fail("user_private returned rows other than my own");
    else console.log(`  ✓ ${table} (${data.length} rows)`);
  }
  await supabase.auth.signOut();
}

console.log(failures ? `\n${failures} privacy check(s) failed` : "\nNo API response contains another user's phone or email.");
process.exit(failures ? 1 : 0);
