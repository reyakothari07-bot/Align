"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, subscribeAsUser } from "@/lib/supabase/client";
import { Alert, Button, Card, cx } from "@/components/ui";
import type { Database } from "@/lib/database.types";
import { POLITE } from "@/lib/constants";
import { errorMessage } from "@/lib/format";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type SendResult = { ok: boolean; id?: string; error?: string; message?: string; violations?: number; suspended?: boolean };

export function DealChat({
  dealId,
  me,
  otherName,
  initial,
  disabled,
}: {
  dealId: string;
  me: string;
  otherName: string;
  initial: Message[];
  disabled: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(disabled);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  useEffect(
    () =>
      subscribeAsUser(`deal:${dealId}`, (channel) =>
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `deal_id=eq.${dealId}` }, (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }),
      ),
    [dealId],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("send_message", { p_deal_id: dealId, p_body: text });
    setSending(false);
    if (error) return setError(errorMessage(error));
    const res = data as SendResult;
    if (!res.ok) {
      if (res.suspended) setLocked(true);
      if (res.error === "contact_info") {
        setError(
          POLITE.contactInfo +
            (res.suspended
              ? " Your account has now been suspended."
              : ` Warning ${res.violations} of 3. Repeated attempts lead to suspension.`),
        );
      } else setError(res.message ?? "Message not sent.");
      return;
    }
    setBody("");
    const { data: msg } = await supabase.from("messages").select("*").eq("id", res.id!).single();
    if (msg) setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
  }

  return (
    <Card className="flex h-[70dvh] min-h-[420px] flex-col overflow-hidden lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-bold">Deal chat with {otherName}</h2>
        <p className="mt-0.5 text-xs text-muted">Share the brief, revisions and shipping details here. Phone numbers, emails and WhatsApp/Telegram links are blocked.</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-canvas px-4 py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hi and share the brief 👋</p>}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[80%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-[15px]",
                  mine ? "rounded-br-lg bg-brand-600 text-white" : "rounded-bl-lg bg-white ring-1 ring-line",
                )}
              >
                {m.body}
                <span className={cx("mt-0.5 block text-right text-[10px]", mine ? "text-brand-100" : "text-muted")}>
                  {new Date(m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="space-y-2 border-t border-line bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {error && <Alert>{error}</Alert>}
        {locked ? (
          <p className="py-2 text-center text-sm text-muted">Chat is disabled while your account is suspended.</p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={body}
              maxLength={1000}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Write a message…"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border-0 bg-canvas px-4 py-3 text-base ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button size="md" className="h-12 shrink-0" loading={sending} disabled={!body.trim()}>
              Send
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
