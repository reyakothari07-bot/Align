"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/form";

export function UserSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(initial);
  return (
    <form
      className="md:w-80"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(params);
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        router.push(`${pathname}?${next}`);
      }}
    >
      <Input type="search" placeholder="Search name, brand, @handle or phone" value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  );
}
