"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Input } from "@/components/form";
import { PortfolioTile } from "@/components/portfolio";

export const PORTFOLIO_MIN = 3;
export const PORTFOLIO_MAX = 6;

/** Upload photos/videos or paste post links. Holds 3–6 items. */
export function PortfolioEditor({ userId, value, onChange }: { userId: string; value: string[]; onChange: (v: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= PORTFOLIO_MAX;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, PORTFOLIO_MAX - value.length)) {
      if (file.size > 15 * 1024 * 1024) {
        setError(`${file.name} is over 15 MB.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
      if (error) {
        setError(`Couldn't upload ${file.name}: ${error.message}`);
        continue;
      }
      added.push(supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl);
    }
    onChange([...value, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addLink() {
    const url = link.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return setError("Paste a full link starting with https://");
    setError(null);
    onChange([...value, url]);
    setLink("");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={url + i} className="relative">
            <PortfolioTile url={url} />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-sm font-semibold text-brand-700"
          >
            {uploading ? "Uploading…" : (
              <>
                <span className="text-2xl leading-none">+</span>
                Add photo / video
              </>
            )}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple hidden onChange={(e) => upload(e.target.files)} />

      {!full && (
        <div className="flex gap-2">
          <Input placeholder="…or paste a post link" value={link} onChange={(e) => setLink(e.target.value)} />
          <Button type="button" variant="secondary" size="md" className="h-12 shrink-0" onClick={addLink} disabled={!link}>
            Add
          </Button>
        </div>
      )}
      <p className="text-xs text-muted">
        {value.length} of {PORTFOLIO_MIN}–{PORTFOLIO_MAX} items
        {value.length < PORTFOLIO_MIN && ` · add ${PORTFOLIO_MIN - value.length} more`}
      </p>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
