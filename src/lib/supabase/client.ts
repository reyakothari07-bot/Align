import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type Client = ReturnType<typeof createClient>;
type Channel = ReturnType<Client["channel"]>;

/**
 * Subscribe to a Realtime channel as the signed-in user. The session is read
 * from cookies asynchronously, so we hand its token to Realtime first;
 * otherwise the channel joins as anon and RLS filters out every event.
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeAsUser(name: string, build: (channel: Channel) => Channel) {
  const supabase = createClient();
  let channel: Channel | null = null;
  let cancelled = false;
  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) await supabase.realtime.setAuth(session.access_token);
    if (cancelled) return;
    channel = build(supabase.channel(name)).subscribe();
  })();
  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
