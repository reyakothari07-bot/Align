import { requireViewer } from "@/lib/session";
import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/logo";

export default async function WelcomePage() {
  const { name, role } = await requireViewer();
  const first = name.split(" ")[0] || name;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-brand-700 to-brand-500 px-4 py-12 text-center text-white">
      <Logo light size="lg" tagline />
      <div className="mt-12 text-5xl">🎉</div>
      <h1 className="mt-6 max-w-md text-3xl font-extrabold tracking-tight">Welcome to Align, {first}!</h1>
      <p className="mt-3 text-lg text-brand-100">Let&apos;s find your perfect match.</p>
      <div className="mt-12 w-full max-w-xs space-y-3">
        <ButtonLink href={role === "brand" ? "/campaigns/new?first=1" : "/home"} variant="secondary" className="!ring-0">
          Get Started
        </ButtonLink>
      </div>
    </div>
  );
}
