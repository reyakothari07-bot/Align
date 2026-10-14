import { ButtonLink } from "@/components/ui";
import { requireViewer } from "@/lib/session";

export default async function DealCompletePage() {
  const { role } = await requireViewer();
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-brand-50 text-5xl">🎉</div>
      <h1 className="mt-6 text-2xl font-bold">Deal complete</h1>
      <p className="mt-2 text-muted">Thanks for rating. Great collaborations build great reputations on Align.</p>
      <div className="mt-10 w-full space-y-3">
        <ButtonLink href="/home?open=filters">{role === "brand" ? "Find another creator" : "Find another match"}</ButtonLink>
        <ButtonLink href="/home" variant="secondary">
          Go to Home
        </ButtonLink>
      </div>
    </div>
  );
}
