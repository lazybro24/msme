export const site = {
  name: "Mysuru MSME Awards 2026",
  tagline: "Recognizing Excellence. Enabling Growth. Inspiring Tomorrow.",
  organizer: "Toya Corporate Consulting Services Pvt. Ltd.",
  year: 2026,
};

/** Public navigation — Eligibility lives under Awards */
export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/awards", label: "Awards" },
  { href: "/jury", label: "Jury" },
  { href: "/event", label: "Event" },
  { href: "/nominate", label: "Nomination" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerExplore = [
  { href: "/about", label: "About" },
  { href: "/about#integrity", label: "Integrity" },
  { href: "/awards", label: "Awards" },
  { href: "/awards#participate", label: "Requirements" },
  { href: "/jury", label: "Jury" },
  { href: "/event", label: "Event" },
  { href: "/contact#faq", label: "FAQ" },
] as const;

export const footerParticipate = [
  { href: "/nominate", label: "Nomination" },
  { href: "/nominate/login", label: "Applicant Login" },
  { href: "/event#partners", label: "Become a Partner" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerGovernance = [
  { href: "/award-rules", label: "Award Rules & Regulations" },
  { href: "/about#integrity", label: "Integrity Charter" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
] as const;
