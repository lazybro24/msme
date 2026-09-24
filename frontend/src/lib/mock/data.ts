import { awardCategories } from "@/content/awards";

export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "Eligibility Review"
  | "Clarification Required"
  | "Verification"
  | "Qualified"
  | "Ready for Jury"
  | "Jury Evaluation"
  | "Moderation Required"
  | "Finalist"
  | "Not Qualified";

export const mockApplicant = {
  name: "Ananya Rao",
  designation: "Managing Director",
  email: "ananya@example.com",
  mobile: "+91 98765 43210",
  organisation: "Mysuru Precision Components Pvt. Ltd.",
  profileCompletion: 100,
  documentsComplete: 7,
  documentsTotal: 7,
};

export const mockApplications = [
  {
    id: "MMA26-MFG-0047",
    categorySlug: "manufacturing-excellence",
    categoryTitle: "Manufacturing Excellence Award",
    status: "Verification" as ApplicationStatus,
    progress: 82,
    submittedAt: "2026-03-12",
    timeline: [
      { label: "Submitted", done: true },
      { label: "Eligibility Review", done: true },
      { label: "Verification", done: false, current: true },
      { label: "Qualified", done: false },
      { label: "Ready for Jury", done: false },
    ],
  },
  {
    id: "MMA26-INN-0012",
    categorySlug: "innovation-technology",
    categoryTitle: "Innovation & Technology Excellence Award",
    status: "Clarification Required" as ApplicationStatus,
    progress: 64,
    submittedAt: "2026-03-14",
    timeline: [
      { label: "Submitted", done: true },
      { label: "Eligibility Review", done: true },
      { label: "Clarification Required", done: false, current: true },
      { label: "Verification", done: false },
      { label: "Qualified", done: false },
      { label: "Jury Evaluation", done: false },
    ],
  },
];

export const mockClarification = {
  applicationId: "MMA26-INN-0012",
  title: "Additional information regarding reported revenue growth",
  deadline: "2026-03-28",
  type: "Financial",
  message:
    "Please upload FY-1 audited financial extracts supporting the 34% revenue growth claim, or provide a clarification note if the figure is management-account based.",
};

export const mockBusinessProfile = {
  legalName: "Mysuru Precision Components Pvt. Ltd.",
  brandName: "MPC",
  constitution: "Private Limited Company",
  established: "2014-06-18",
  industry: "Manufacturing — Auto Components",
  activity: "Precision CNC machining for automotive and industrial OEMs",
  website: "https://example.com",
  linkedin: "https://linkedin.com/company/example",
  registeredAddress: "Hebbal Industrial Area, Mysuru",
  udyam: "UDYAM-KR-20-0012345",
  udyamDate: "2018-04-12",
  classification: "Small",
  pan: "AABCM1234F",
  gstin: "29AABCM1234F1Z5",
  cin: "U29100KA2014PTC012345",
  employees: 86,
  locations: 2,
  mysuruAddress: "Hebbal Industrial Area, Mysuru",
  pinCode: "570016",
};

export const applicationSteps = [
  { id: 1, key: "profile", label: "Business Profile" },
  { id: 2, key: "eligibility", label: "Eligibility" },
  { id: 3, key: "overview", label: "Business Overview" },
  { id: 4, key: "performance", label: "Business Performance" },
  { id: 5, key: "category", label: "Category Questions" },
  { id: 6, key: "mysuru", label: "Mysuru Contribution" },
  { id: 7, key: "signature", label: "Signature Achievement" },
  { id: 8, key: "evidence", label: "Evidence" },
  { id: 9, key: "declaration", label: "Declaration" },
  { id: 10, key: "review", label: "Review & Submit" },
] as const;

export const mockSecretariatStats = {
  total: 214,
  submitted: 198,
  eligibilityPending: 27,
  clarificationsPending: 14,
  verified: 96,
  qualified: 71,
  readyForJury: 48,
  underEvaluation: 33,
  moderationRequired: 4,
  finalists: 12,
  notQualified: 18,
};

export const mockSecretariatApplications = [
  {
    id: "MMA26-MFG-0047",
    category: "Manufacturing Excellence",
    organisation: "Mysuru Precision Components Pvt. Ltd.",
    sector: "Manufacturing",
    msme: "Small",
    status: "Jury Evaluation",
    evidence: "Strong",
    assignedJudges: 3,
  },
  {
    id: "MMA26-SRV-0091",
    category: "Service Excellence",
    organisation: "Chamundi Digital Services",
    sector: "Services",
    msme: "Micro",
    status: "Clarification Required",
    evidence: "Partial",
    assignedJudges: 0,
  },
  {
    id: "MMA26-GRW-0033",
    category: "Growth Excellence",
    organisation: "Kaveri Foods LLP",
    sector: "Food Processing",
    msme: "Medium",
    status: "Ready for Jury",
    evidence: "Strong",
    assignedJudges: 0,
  },
  {
    id: "MMA26-WEN-0018",
    category: "Women Entrepreneur",
    organisation: "Silk & Loom Co.",
    sector: "Textiles",
    msme: "Small",
    status: "Verification",
    evidence: "Good",
    assignedJudges: 0,
  },
  {
    id: "MMA26-EMG-0055",
    category: "Emerging MSME",
    organisation: "Namma AgriTech",
    sector: "Agri-tech",
    msme: "Micro",
    status: "Eligibility Review",
    evidence: "Pending",
    assignedJudges: 0,
  },
];

export const mockJuryAssignments = [
  {
    id: "MMA26-MFG-0047",
    category: "Manufacturing Excellence",
    sector: "Manufacturing",
    status: "Pending",
    deadline: "2026-04-10",
    conflictCleared: true,
  },
  {
    id: "MMA26-MFG-0021",
    category: "Manufacturing Excellence",
    sector: "Manufacturing",
    status: "Completed",
    deadline: "2026-04-10",
    conflictCleared: true,
  },
  {
    id: "MMA26-SSI-0008",
    category: "Sustainability & Social Impact",
    sector: "Services",
    status: "Conflict Declared",
    deadline: "2026-04-12",
    conflictCleared: false,
  },
  {
    id: "MMA26-EMP-0014",
    category: "Employer of the Year",
    sector: "Manufacturing",
    status: "Pending",
    deadline: "2026-04-12",
    conflictCleared: false,
  },
];

export const manufacturingScorecard =
  awardCategories.find((c) => c.code === "MFG")?.criteria ?? [];

export const mockScores = [
  { judge: "Judge 1", score: 82 },
  { judge: "Judge 2", score: 79 },
  { judge: "Judge 3", score: 81 },
];

/** Extreme variance example — must trigger moderation, not blind average. */
export const mockVarianceCase = {
  id: "MMA26-SRV-0044",
  category: "Service Excellence",
  scores: [
    { judge: "Judge A", score: 91, comment: "Exceptional service recovery evidence." },
    { judge: "Judge B", score: 74, comment: "Strong ops; weaker innovation case." },
    { judge: "Judge C", score: 58, comment: "Claims under-supported by documents." },
  ],
  reason: "Spread > 20 points across evaluators",
  status: "Moderation Required" as const,
};

export const mockCategoryRanking = [
  { rank: 1, id: "MMA26-MFG-0047", score: 87.3, evidence: "Strong", verification: "Complete", org: "Mysuru Precision Components" },
  { rank: 2, id: "MMA26-MFG-0021", score: 85.8, evidence: "Strong", verification: "Complete", org: "Hebbal Components" },
  { rank: 3, id: "MMA26-MFG-0060", score: 82.6, evidence: "Strong", verification: "Complete", org: "Cauvery Tooling" },
  { rank: 4, id: "MMA26-MFG-0011", score: 80.1, evidence: "Good", verification: "Complete", org: "Nanjangud Alloys" },
  { rank: 5, id: "MMA26-MFG-0039", score: 78.9, evidence: "Good", verification: "Complete", org: "Srirangapatna Plastics" },
];

export const mockFinalistAssessment = {
  id: "MMA26-MFG-0047",
  org: "Mysuru Precision Components Pvt. Ltd.",
  documentaryScore: 84,
  documentaryWeighted: 58.8,
  finalistScore: 88,
  finalistWeighted: 26.4,
  finalScore: 85.2,
  recommendation: "Podium eligible",
};

export const mockMsmeOfYear = [
  { id: "MMA26-MFG-0047", org: "Mysuru Precision Components", category: "Manufacturing", finalScore: 85.2, qualifies: true },
  { id: "MMA26-INN-0012", org: "Chamundi Labs", category: "Innovation", finalScore: 81.0, qualifies: true },
  { id: "MMA26-GRW-0033", org: "Kaveri Foods LLP", category: "Growth", finalScore: 79.4, qualifies: true },
  { id: "MMA26-WEN-0018", org: "Silk & Loom Co.", category: "Women Entrepreneur", finalScore: 72.1, qualifies: false },
];

export const grandJuryScorecard = [
  { name: "Business & Financial Performance", points: 20 },
  { name: "Sustainable Growth", points: 15 },
  { name: "Innovation & Competitive Advantage", points: 15 },
  { name: "Customer & Market Excellence", points: 10 },
  { name: "People & Employment Impact", points: 10 },
  { name: "Governance & Compliance", points: 10 },
  { name: "Sustainability & Social Impact", points: 10 },
  { name: "Leadership & Future Readiness", points: 10 },
];

export const mockAuditEvents = [
  {
    at: "2026-04-01 11:22",
    user: "V. Menon",
    role: "Verification",
    action: "Eligibility confirmed",
    application: "MMA26-MFG-0047",
  },
  {
    at: "2026-04-03 09:10",
    user: "A. Iyer",
    role: "Administrator",
    action: "Jury assignment (3 evaluators)",
    application: "MMA26-MFG-0047",
  },
  {
    at: "2026-04-05 16:40",
    user: "Dr. S. Krishnan",
    role: "Jury",
    action: "Evaluation submitted — score locked",
    application: "MMA26-MFG-0047",
  },
  {
    at: "2026-04-06 10:05",
    user: "System",
    role: "System",
    action: "Variance within threshold — no moderation",
    application: "MMA26-MFG-0047",
  },
  {
    at: "2026-04-07 14:18",
    user: "System",
    role: "System",
    action: "⚠ Moderation Required — variance alert",
    application: "MMA26-SRV-0044",
  },
  {
    at: "2026-04-08 09:45",
    user: "Jury Chair",
    role: "Jury Chair",
    action: "Moderation panel opened — independent reconsider requested",
    application: "MMA26-SRV-0044",
  },
];
