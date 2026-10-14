"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeAsUser } from "@/lib/supabase/client";

export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const router = useRouter();

  // Server count wins whenever the layout re-renders (e.g. after visiting /notifications).
  const [serverCount, setServerCount] = useState(initialUnread);
  if (serverCount !== initialUnread) {
    setServerCount(initialUnread);
    setUnread(initialUnread);
  }

  useEffect(
    () =>
      subscribeAsUser(`bell:${userId}`, (channel) =>
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            setUnread((n) => n + 1);
            // Pull fresh server data (request lists, deal status) when something happens.
            router.refresh();
          },
        ),
      ),
    [userId, router],
  );

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded-full p-2.5 text-ink hover:bg-brand-50"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
