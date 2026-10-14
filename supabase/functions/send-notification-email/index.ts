// Sends the email copy of an in-site notification through Resend.
// Called by the notifications_email trigger (pg_net) with {"notification_id": "..."}.
//
// Secrets (supabase secrets set ...): RESEND_API_KEY, NOTIFY_WEBHOOK_SECRET, EMAIL_FROM, SITE_URL
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("NOTIFY_WEBHOOK_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { notification_id } = await req.json();

  const { data: n } = await admin.from("notifications").select("*").eq("id", notification_id).single();
  if (!n || n.emailed_at) return Response.json({ skipped: "missing or already sent" });

  const { data: priv } = await admin.from("user_private").select("email").eq("user_id", n.user_id).single();
  if (!priv?.email) return Response.json({ skipped: "no email on file" });

  const link = `${SITE_URL}${n.link ?? "/home"}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1530">
      <div style="font-size:22px;font-weight:800;color:#7535ef;margin-bottom:24px">align</div>
      <h1 style="font-size:20px;margin:0 0 8px">${escape(n.title)}</h1>
      ${n.body ? `<p style="font-size:15px;line-height:1.5;color:#4b4560;margin:0 0 24px">${escape(n.body)}</p>` : ""}
      <a href="${link}" style="display:inline-block;background:#7535ef;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:14px">Open Align</a>
      <p style="font-size:12px;color:#8a8499;margin-top:32px">You're getting this because you have an account on Align.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: priv.email, subject: n.title, html }),
  });
  if (!res.ok) return new Response(`Resend error: ${await res.text()}`, { status: 502 });

  await admin.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
  return Response.json({ sent: true });
});
