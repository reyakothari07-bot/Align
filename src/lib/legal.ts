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
};

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
