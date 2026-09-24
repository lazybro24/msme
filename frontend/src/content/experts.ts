/**
 * Expert voice cards — photo slot left empty for later assets.
 * Drop images into /public/images/experts/ and set `photo` on each item.
 */

export type ExpertVoice = {
  initials: string;
  name: string;
  role: string;
  partner: string;
  quote: string;
  saying: string;
  /** Optional path under /public, e.g. /images/experts/bhagyalakshmi.jpg */
  photo?: string;
  org: string;
};

export const expertVoices: ExpertVoice[] = [
  {
    initials: "BA",
    name: "Dr. Bhagyalakshmi Avinash",
    role: "Orthodontist & Smile Transformation Expert",
    partner: "Dental Care Partner",
    quote:
      "Meaningful smile transformation comes from clinical expertise woven into a guest's full journey — not a single appointment in isolation.",
    saying: "Transforming Smiles. Inspiring Confidence.",
    org: "DENTAL",
    // photo: "/images/experts/bhagyalakshmi.jpg",
  },
  {
    initials: "AN",
    name: "Dr. Akshatha N",
    role: "Integrative Wellness & Nutrition Expert",
    partner: "Wellness & Lifestyle Partner",
    quote:
      "True wellbeing restores balance — nutrition, movement and relaxation working together so every guest can reconnect with themselves.",
    saying: "Restore. Rebalance. Reconnect.",
    org: "WELLNESS",
    // photo: "/images/experts/akshatha.jpg",
  },
  {
    initials: "DS",
    name: "Dr. Dharini Shashank",
    role: "Consultant Plastic & Cosmetic Surgeon",
    partner: "Aesthetic & Cosmetic Surgery Partner",
    quote:
      "Aesthetic care should enhance confidence with professional guidance — connected thoughtfully to recovery, wellness and hospitality.",
    saying: "Enhancing Confidence. Professionally Guided.",
    org: "AESTHETICS",
    // photo: "/images/experts/dharini.jpg",
  },
];
