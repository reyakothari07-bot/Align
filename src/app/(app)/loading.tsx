// Shown instantly while a signed-in page loads, so navigation feels immediate.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-xl bg-brand-100/70" />
      <div className="h-4 w-72 max-w-full rounded-lg bg-brand-100/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 rounded-3xl bg-white ring-1 ring-line">
            <div className="h-28 rounded-t-3xl bg-brand-50" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-1/2 rounded bg-brand-100/70" />
              <div className="h-3 w-1/3 rounded bg-brand-100/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
