import { BRAND_TERMS, BRAND_TERMS_VERSION, type TermsSection } from "@/lib/legal";

export function LegalSections({ sections, version }: { sections: TermsSection[]; version: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Version {version}</p>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-2 text-base font-bold">{section.title}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink/90">
            {section.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function BrandTermsContent() {
  return <LegalSections sections={BRAND_TERMS} version={BRAND_TERMS_VERSION} />;
}
