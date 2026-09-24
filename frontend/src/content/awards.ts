export type AwardCategory = {
  slug: string;
  code: string;
  number: string;
  title: string;
  shortTitle: string;
  tagline: string;
  overview: string;
  eligibility: string[];
  whoShouldApply: string[];
  criteria: { name: string; points: number }[];
  evidence: string[];
  recognition: string[];
  directApply: boolean;
};

export const awardCategories: AwardCategory[] = [
  {
    slug: "msme-of-the-year",
    code: "MOTY",
    number: "01",
    title: "MSME of the Year",
    shortTitle: "MSME of the Year",
    tagline: "The Highest Honour",
    overview:
      "Recognising exceptional overall business excellence, sustainable growth, innovation, leadership, governance and impact.",
    eligibility: [
      "Qualification-based — no direct application",
      "High-performing eligible businesses from Categories 02–10 may qualify for Grand Jury consideration",
      "Recommended rule: strong final score, verified evidence, no unresolved compliance concern",
    ],
    whoShouldApply: [
      "Not open for direct nomination",
      "Top performers across other categories are considered by the Secretariat and Grand Jury",
    ],
    criteria: [
      { name: "Business & Financial Performance", points: 20 },
      { name: "Sustainable Growth", points: 15 },
      { name: "Innovation & Competitive Advantage", points: 15 },
      { name: "Customer & Market Excellence", points: 10 },
      { name: "People & Employment Impact", points: 10 },
      { name: "Governance & Compliance", points: 10 },
      { name: "Sustainability & Social Impact", points: 10 },
      { name: "Leadership & Future Readiness", points: 10 },
    ],
    evidence: [
      "Cross-category performance dossier",
      "Verification and conflict clearance pack",
      "Grand Jury presentation materials (finalists)",
    ],
    recognition: ["Winner", "MSME of the Year Finalists (up to five)"],
    directApply: false,
  },
  {
    slug: "manufacturing-excellence",
    code: "MFG",
    number: "02",
    title: "Manufacturing Excellence Award",
    shortTitle: "Manufacturing Excellence",
    tagline: "Quality, productivity and operational excellence",
    overview:
      "Recognising outstanding manufacturing performance, quality, productivity and operational excellence.",
    eligibility: [
      "Valid Udyam Registration",
      "Substantial operations within Mysuru District",
      "Primary activity in manufacturing / production",
      "Verifiable performance and quality evidence",
    ],
    whoShouldApply: [
      "Manufacturers with measurable productivity or quality gains",
      "Units investing in process innovation, automation or safety",
      "Enterprises with strong shop-floor and compliance practices",
    ],
    criteria: [
      { name: "Manufacturing Performance & Productivity", points: 20 },
      { name: "Quality Management", points: 15 },
      { name: "Process Innovation & Automation", points: 15 },
      { name: "Operational Efficiency", points: 15 },
      { name: "Safety & Compliance", points: 10 },
      { name: "Sustainable Manufacturing", points: 10 },
      { name: "Workforce Development", points: 5 },
      { name: "Growth & Market Performance", points: 10 },
    ],
    evidence: [
      "Production / efficiency reports",
      "Quality certifications and audit records",
      "Safety and compliance documentation",
      "Investment and capacity expansion proof",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "service-excellence",
    code: "SRV",
    number: "03",
    title: "Service Excellence Award",
    shortTitle: "Service Excellence",
    tagline: "Customer experience and service delivery",
    overview:
      "Recognising exceptional service delivery, customer experience and operational excellence.",
    eligibility: [
      "Valid Udyam Registration",
      "Substantial Mysuru District operations",
      "Primary activity in services",
    ],
    whoShouldApply: [
      "Service businesses with strong customer outcomes",
      "Firms with scalable delivery models and retention proof",
    ],
    criteria: [
      { name: "Service Delivery Excellence", points: 20 },
      { name: "Customer Experience & Satisfaction", points: 20 },
      { name: "Operational Reliability", points: 15 },
      { name: "Process & Digital Enablement", points: 15 },
      { name: "People Capability", points: 10 },
      { name: "Growth & Market Reach", points: 10 },
      { name: "Compliance & Governance", points: 10 },
    ],
    evidence: [
      "Customer feedback / NPS / testimonials",
      "SLA or delivery metrics",
      "Process documentation",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "emerging-msme",
    code: "EMG",
    number: "04",
    title: "Emerging MSME of the Year",
    shortTitle: "Emerging MSME",
    tagline: "Traction, differentiation and scalability",
    overview:
      "Recognising high-potential enterprises demonstrating traction, differentiation and scalability.",
    eligibility: [
      "Commercial operations of at least 1 year and not more than 5 years",
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
    ],
    whoShouldApply: [
      "Young enterprises with clear product-market fit",
      "Businesses showing early growth and differentiation",
    ],
    criteria: [
      { name: "Traction & Growth Momentum", points: 20 },
      { name: "Differentiation & Value Proposition", points: 20 },
      { name: "Scalability & Operating Model", points: 15 },
      { name: "Innovation / Technology Adoption", points: 15 },
      { name: "Team & Leadership", points: 10 },
      { name: "Market Opportunity", points: 10 },
      { name: "Governance Basics", points: 10 },
    ],
    evidence: [
      "Incorporation / commencement proof",
      "Early revenue / customer traction evidence",
      "Product or service differentiation materials",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "innovation-technology",
    code: "INN",
    number: "05",
    title: "Innovation & Technology Excellence Award",
    shortTitle: "Innovation & Technology",
    tagline: "Measurable value through innovation",
    overview:
      "Recognising businesses creating measurable value through innovation and technology.",
    eligibility: [
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
      "Demonstrable innovation or technology outcomes",
    ],
    whoShouldApply: [
      "Enterprises with product, process or digital innovation",
      "Businesses with IP, platforms or tech-led efficiency gains",
    ],
    criteria: [
      { name: "Innovation Impact", points: 25 },
      { name: "Technology Adoption / Build", points: 20 },
      { name: "Business Value Created", points: 20 },
      { name: "Scalability of Innovation", points: 15 },
      { name: "Capability & Talent", points: 10 },
      { name: "Risk, Security & Governance", points: 10 },
    ],
    evidence: [
      "Innovation case studies",
      "Patents / certifications where applicable",
      "Before-after performance metrics",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "growth-excellence",
    code: "GRW",
    number: "06",
    title: "Growth Excellence Award",
    shortTitle: "Growth Excellence",
    tagline: "Sustained, responsible growth",
    overview:
      "Recognising sustained, responsible and measurable business growth.",
    eligibility: [
      "Minimum three completed financial years preferred",
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
    ],
    whoShouldApply: [
      "Businesses with multi-year revenue / market growth",
      "Enterprises expanding capacity, markets or employment responsibly",
    ],
    criteria: [
      { name: "Revenue & Profitability Growth", points: 25 },
      { name: "Market Expansion", points: 15 },
      { name: "Employment & Capability Growth", points: 15 },
      { name: "Investment & Capacity Building", points: 15 },
      { name: "Sustainability of Growth", points: 15 },
      { name: "Governance & Risk Discipline", points: 15 },
    ],
    evidence: [
      "Three-year financial performance",
      "Market expansion proof",
      "Investment and hiring evidence",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "women-entrepreneur",
    code: "WEN",
    number: "07",
    title: "Women Entrepreneur of the Year",
    shortTitle: "Women Entrepreneur",
    tagline: "Exceptional woman-led leadership",
    overview:
      "Recognising exceptional entrepreneurial leadership by a woman business leader.",
    eligibility: [
      "Substantial ownership and/or active entrepreneurial leadership by a woman",
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
    ],
    whoShouldApply: [
      "Woman founders, promoters or active business leaders",
      "Enterprises where a woman demonstrably drives strategy and outcomes",
    ],
    criteria: [
      { name: "Entrepreneurial Leadership", points: 25 },
      { name: "Business Performance", points: 20 },
      { name: "Innovation / Differentiation", points: 15 },
      { name: "People & Ecosystem Impact", points: 15 },
      { name: "Resilience & Governance", points: 15 },
      { name: "Contribution to Mysuru", points: 10 },
    ],
    evidence: [
      "Leadership / ownership documentation",
      "Business performance evidence",
      "Impact narratives with proof",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "young-entrepreneur",
    code: "YEN",
    number: "08",
    title: "Young Entrepreneur of the Year",
    shortTitle: "Young Entrepreneur",
    tagline: "Outstanding leadership aged 35 or below",
    overview:
      "Recognising outstanding entrepreneurial achievement by a business leader aged 35 or below.",
    eligibility: [
      "Nominated entrepreneur aged 35 or below on the official cut-off date",
      "Active founder / promoter / leadership role",
      "Valid Udyam Registration and Mysuru operations",
    ],
    whoShouldApply: [
      "Young founders and business leaders with proven achievement",
    ],
    criteria: [
      { name: "Entrepreneurial Achievement", points: 25 },
      { name: "Business Traction", points: 20 },
      { name: "Innovation & Ambition", points: 15 },
      { name: "Leadership Maturity", points: 15 },
      { name: "Scalability Potential", points: 15 },
      { name: "Mysuru Contribution", points: 10 },
    ],
    evidence: [
      "Age / identity proof for nominee",
      "Leadership role evidence",
      "Business achievement evidence",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "sustainability-social-impact",
    code: "SSI",
    number: "09",
    title: "Sustainability & Social Impact Award",
    shortTitle: "Sustainability & Social Impact",
    tagline: "Measurable environmental or social impact",
    overview:
      "Recognising enterprises delivering measurable environmental or social impact.",
    eligibility: [
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
      "Documented sustainability or social programmes with outcomes",
    ],
    whoShouldApply: [
      "Enterprises with ESG programmes tied to business practice",
      "Businesses measuring community or environmental outcomes",
    ],
    criteria: [
      { name: "Impact Clarity & Measurement", points: 25 },
      { name: "Environmental / Social Outcomes", points: 25 },
      { name: "Integration with Business Model", points: 15 },
      { name: "Stakeholder Engagement", points: 15 },
      { name: "Governance & Transparency", points: 10 },
      { name: "Scalability / Continuity", points: 10 },
    ],
    evidence: [
      "Impact metrics and reports",
      "Certifications where applicable",
      "Community / environment programme proof",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
  {
    slug: "employer-of-the-year",
    code: "EMP",
    number: "10",
    title: "Employer of the Year",
    shortTitle: "Employer of the Year",
    tagline: "Workplace culture and people practices",
    overview:
      "Recognising outstanding workplace culture, employee development and responsible people practices.",
    eligibility: [
      "Minimum operating history and recommended employee threshold",
      "Valid Udyam Registration",
      "Substantial Mysuru operations",
    ],
    whoShouldApply: [
      "Employers with strong culture, learning and retention practices",
      "Businesses investing in safety, inclusion and development",
    ],
    criteria: [
      { name: "Workplace Culture", points: 20 },
      { name: "Learning & Development", points: 20 },
      { name: "Employee Wellbeing & Safety", points: 15 },
      { name: "Inclusion & Fair Practices", points: 15 },
      { name: "Retention & Engagement", points: 15 },
      { name: "People Governance", points: 15 },
    ],
    evidence: [
      "HR policies and programmes",
      "Training / safety records",
      "Employee engagement evidence",
    ],
    recognition: ["Winner", "1st Runner-Up", "2nd Runner-Up", "Official Finalist", "Official Finalist"],
    directApply: true,
  },
];

export function getCategoryBySlug(slug: string) {
  return awardCategories.find((c) => c.slug === slug);
}

export function getDirectApplyCategories() {
  return awardCategories.filter((c) => c.directApply);
}
