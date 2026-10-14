// Align Brand Terms.
//
// DRAFT: written in plain English as a starting point. Have a lawyer review it
// before launch, and fill in the [bracketed] details.
//
// When the wording changes, bump BRAND_TERMS_VERSION here AND in the database
// (public.brand_terms_version() in a new migration). Every brand is then asked
// to accept the new version before they can continue.

export const BRAND_TERMS_VERSION = "2026-10-14";

/** Days after the creator marks the content as posted, by which the brand must pay. */
export const PAYMENT_DAYS = 7;

export const LEGAL = {
  company: "[Align's registered company name]",
  supportEmail: "[support email]",
  city: "[city]",
  grievanceOfficer: "[Grievance Officer name]",
};

export const PRIVACY_VERSION = "2026-10-14";

export type TermsSection = { title: string; points: string[] };

export const BRAND_TERMS: TermsSection[] = [
  {
    title: "1. What Align is",
    points: [
      `Align is a marketplace run by ${LEGAL.company} ("Align", "we") that connects brands with Instagram creators for paid and barter collaborations.`,
      "Right now, payment for a collaboration is made directly by the brand to the creator, outside Align. Align does not hold or transfer the money.",
      'By using Align as a brand, you ("the Brand") agree to these terms.',
    ],
  },
  {
    title: "2. When a deal becomes binding",
    points: [
      "A deal is agreed when you send a request that the creator accepts, or when you accept or counter a creator's application or offer.",
      "Each time you commit to a price, you confirm that you agree to pay it. Align records the date, time and the version of these terms you agreed to.",
      "The agreed terms are the ones shown on the Deal Card: deliverable, content type, price or barter product, and deadline. Once agreed, they form a binding agreement between you and the creator.",
    ],
  },
  {
    title: "3. Your promise to pay",
    points: [
      `For paid deals, you must pay the creator the full agreed amount within ${PAYMENT_DAYS} days after the creator marks the content as posted on Align and adds the post link.`,
      "For barter deals, you must send the agreed product to the creator, at your cost, in time for the creator to meet the deadline.",
      'For "paid + product" deals, both of the above apply.',
      "You may not reduce, delay or withhold payment, except by raising a dispute on Align within the payment period (see section 4).",
      "Approving or using the content (including reposting, running it as an ad, or sharing it) means you accept it, and the full amount is due.",
      "A paid deal is only marked complete after the creator confirms on Align that they have been paid.",
    ],
  },
  {
    title: "4. Disputes",
    points: [
      `If the content does not match what was agreed, raise a dispute from the Deal Card within ${PAYMENT_DAYS} days of it being marked as posted, and explain why.`,
      "Align will review the Deal Card, the deal chat and the post, and may ask both sides for more information. We will try to help you and the creator reach a fair outcome.",
      "If no dispute is raised in that time, the content is treated as accepted and payment is due in full.",
      `If you have not paid within ${PAYMENT_DAYS} days of the content going live, the creator can report non-payment from the Deal Card. Align will review it with both sides.`,
    ],
  },
  {
    title: "5. If you don't pay",
    points: [
      "Open non-payment reports are shown on your brand profile and campaigns until they are resolved.",
      "Align may warn, suspend or permanently remove your account.",
      "Align may share the deal records (Deal Card, chat history, and the record of your agreement to pay) with the creator so they can recover the money, including through legal action.",
      "You remain legally responsible for any amount you agreed to pay.",
    ],
  },
  {
    title: "6. Keep it on Align",
    points: [
      "Do not share or ask for phone numbers, email addresses, or WhatsApp or Telegram contacts, and do not try to move a deal off Align. Repeated attempts lead to suspension.",
      "Use the deal chat for the brief, revisions and shipping details.",
    ],
  },
  {
    title: "7. Using the content",
    points: [
      "You may use the creator's content only in the ways agreed in the deal. Content posted on the creator's own Instagram account stays on their account.",
      "If you want extra rights (for example running it as a paid ad, or using it beyond the agreed period), agree this with the creator in the deal chat before the deal is accepted.",
    ],
  },
  {
    title: "8. Your account",
    points: [
      "You must be 18 or older and authorised to act for the brand you register.",
      "The information on your brand profile must be true and kept up to date.",
    ],
  },
  {
    title: "9. Changes to these terms",
    points: [
      "We may update these terms. If we do, you will be asked to read and accept the new version before you can continue using Align. Deals already agreed stay under the version you agreed to.",
    ],
  },
  {
    title: "10. Law and contact",
    points: [
      `These terms are governed by the laws of India, and the courts of ${LEGAL.city} have jurisdiction.`,
      `Questions or complaints: ${LEGAL.supportEmail}.`,
    ],
  },
];

/** One-line promise shown next to every brand action that commits to a price. */
export function paymentPromise(opts: { creator: string; amount: string; barter: boolean; both?: boolean }) {
  if (opts.barter) return `I agree to send ${opts.creator} the product in time for the deadline, as per the Align Brand Terms.`;
  const product = opts.both ? " and send the product" : "";
  return `I agree to pay ${opts.creator} ${opts.amount}${product} within ${PAYMENT_DAYS} days of the content going live, as per the Align Brand Terms.`;
}

// Align Privacy Policy. DRAFT, like the Brand Terms: plain English, to be
// reviewed by a lawyer (India's DPDP Act 2023 and IT Rules) before launch.
export const PRIVACY_POLICY: TermsSection[] = [
  {
    title: "1. Who we are",
    points: [
      `Align is run by ${LEGAL.company} ("Align", "we"). This policy explains what personal data we collect when you use Align, why, and the choices you have.`,
    ],
  },
  {
    title: "2. What we collect",
    points: [
      "Account details: your name, phone number, email address, and how you sign in (phone code or Google).",
      "Profile details: for creators, age, Instagram handle, follower count, niche, city, content types, rates, bio and portfolio items. For brands: brand name, industry, Instagram handle, followers, location, target audience and description.",
      "Activity on Align: campaigns, requests, offers and counter-offers, deals and their status, deal chat messages, ratings and reviews, and notifications.",
      "Records of agreements: when a brand accepts the Brand Terms or agrees to pay for a deal, we save the date, time and terms version.",
      "Basic technical data needed to keep you signed in and the service secure (such as login session cookies).",
    ],
  },
  {
    title: "3. Why we use it",
    points: [
      "To run Align: create your account, show your profile, match creators and brands, and manage deals.",
      "To keep Align safe: block contact details in chat, prevent misuse, handle disputes and non-payment reports, and suspend accounts that break the rules.",
      "To send you notifications about your requests and deals, in the app and (if you gave us your email) by email.",
    ],
  },
  {
    title: "4. What other users can see",
    points: [
      "Other users can see your public profile: name (or brand name), Instagram handle, followers, niche or industry, city or location, rates, portfolio, ratings and reviews.",
      "Your phone number and email address are never shown to other users. The other side of a deal sees only what you share in the deal chat, which blocks contact details.",
      "The Align team can see your contact details to support you and resolve disputes.",
    ],
  },
  {
    title: "5. Who we share it with",
    points: [
      "Service providers that run Align for us: hosting and database (Supabase, Vercel), sign-in (Google, if you use it), and SMS and email delivery providers. They process data only to provide their service to us.",
      "If a brand does not pay, we may share deal records with the creator involved so they can recover the money.",
      "If the law requires it, we may share data with authorities.",
      "We do not sell your personal data.",
    ],
  },
  {
    title: "6. How long we keep it",
    points: [
      "We keep your data while your account is active. Deal records may be kept longer where needed to resolve disputes or meet legal obligations.",
      "If you delete your account, we delete or anonymise your personal data unless we must keep it by law.",
    ],
  },
  {
    title: "7. Your rights",
    points: [
      "You can see and update most of your details from your profile.",
      `You can ask us to access, correct or delete your personal data, or withdraw consent, by writing to ${LEGAL.supportEmail}.`,
    ],
  },
  {
    title: "8. Age",
    points: ["Align is only for people aged 18 and over. We do not knowingly collect data from anyone under 18."],
  },
  {
    title: "9. Security",
    points: [
      "Data is stored with access controls so each user can only see what they are allowed to. No system is perfectly secure, but we work to protect your data.",
    ],
  },
  {
    title: "10. Changes and contact",
    points: [
      "We may update this policy and will show the new version on this page.",
      `Grievance Officer: ${LEGAL.grievanceOfficer}, ${LEGAL.supportEmail}.`,
    ],
  },
];
