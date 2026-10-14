import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { BrandTermsContent } from "@/components/terms-content";

export const metadata: Metadata = { title: "Brand Terms — Align" };

// Public: brands can read the terms before signing up.
export default function BrandTermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">Align Brand Terms</h1>
      <p className="mt-1 text-sm text-muted">What brands agree to when they use Align, including the promise to pay creators.</p>
      <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line">
        <BrandTermsContent />
      </div>
    </div>
  );
}
