import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LegalSections } from "@/components/terms-content";
import { PRIVACY_POLICY, PRIVACY_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy — Align" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted">What personal data Align collects, why, and your choices.</p>
      <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line">
        <LegalSections sections={PRIVACY_POLICY} version={PRIVACY_VERSION} />
      </div>
    </div>
  );
}
