import { portfolioKind } from "@/lib/format";

/** `preview` renders a non-clickable tile, for use inside another link (e.g. a creator card). */
export function PortfolioTile({ url, preview }: { url: string; preview?: boolean }) {
  const kind = portfolioKind(url);
  const tile = "aspect-[4/5] w-full rounded-2xl bg-brand-50 object-cover ring-1 ring-line";
  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Portfolio item" className={tile} loading="lazy" />;
  }
  if (kind === "video") {
    return <video src={url} className={tile} muted playsInline controls={!preview} preload="metadata" />;
  }
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const linkTile = `${tile} flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-100 to-brand-200 p-3 text-center`;
  const content = (
    <>
      <span className="text-2xl">🔗</span>
      <span className="line-clamp-2 break-all text-xs font-semibold text-brand-800">{host}</span>
    </>
  );
  if (preview) return <div className={linkTile}>{content}</div>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={linkTile}>
      {content}
    </a>
  );
}

export function PortfolioGrid({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((url, i) => (
        <PortfolioTile key={url + i} url={url} />
      ))}
    </div>
  );
}
