import crypto from "crypto";

export type Role =
  | "APPLICANT"
  | "VERIFICATION"
  | "ADMINISTRATOR"
  | "JURY"
  | "JURY_CHAIR"
  | "OBSERVER";

export type AppStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "ELIGIBILITY_REVIEW"
  | "CLARIFICATION_REQUIRED"
  | "VERIFICATION"
  | "QUALIFIED"
  | "READY_FOR_JURY"
  | "NOT_QUALIFIED"
  | "JURY_EVALUATION"
  | "MODERATION_REQUIRED"
  | "FINALIST"
  | "FINAL_ASSESSMENT"
  | "RANKING_READY"
  | "RESULT_LOCKED";

export type User = {
  id: string;
  email: string;
  mobile?: string;
  fullName: string;
  designation?: string;
  password: string;
  roles: Role[];
  orgName?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  recommendedSlugs?: string[];
  /** Award category codes this juror may evaluate (empty = all) */
  categoryCodes?: string[];
  expertise?: string;
  affiliation?: string;
  active?: boolean;
  notes?: string;
};

export type ClarificationMessage = {
  id: string;
  at: string;
  by: string;
  role: string;
  body: string;
  documentName?: string;
};

export type Clarification = {
  id: string;
  applicationId: string;
  type: string;
  title: string;
  deadline?: string;
  requiredDocument?: string;
  status: "OPEN" | "RESPONDED" | "ACCEPTED" | "REJECTED" | "FURTHER";
  thread: ClarificationMessage[];
};

export type CriterionScore = { name: string; points: number; score: number; comment?: string };

export type Evaluation = {
  id: string;
  applicationId: string;
  juryUserId: string;
  juryName: string;
  scores: CriterionScore[];
  totalScore: number;
  overall?: string;
  strengths?: string;
  concerns?: string;
  recommendation?: string;
  lockedAt?: string;
  originalSnapshot?: Evaluation;
  reopenRequest?: { reason: string; at: string; approved?: boolean };
};

export type Application = {
  id: string;
  applicationId: string;
  categoryCode: string;
  categorySlug: string;
  categoryTitle: string;
  status: AppStatus;
  progress: number;
  applicantId: string;
  organisationName: string;
  sector: string;
  msme: string;
  draftJson?: Record<string, unknown>;
  submittedAt?: string;
  assignedJuryIds: string[];
  commercialHidden: true;
  sponsorNote?: string;
  documentaryScore?: number;
  finalistScore?: number;
  finalScore?: number;
  rank?: number;
  evidenceStrength?: "A" | "B" | "C" | "D";
  /** Admin verification outcome */
  adminDecision?: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
};

export type BusinessProfile = {
  userId: string;
  legalName: string;
  brandName: string;
  constitution: string;
  established: string;
  industry: string;
  activity: string;
  website: string;
  linkedin: string;
  registeredAddress: string;
  mysuruAddress: string;
  pinCode: string;
  udyam: string;
  udyamDate: string;
  classification: string;
  pan: string;
  gstin: string;
  cin: string;
  employees: string;
  locations: string;
  repName: string;
  repDesignation: string;
  repEmail: string;
  repMobile: string;
  updatedAt?: string;
  completedAt?: string;
};

export const PROFILE_REQUIRED_FIELDS: (keyof BusinessProfile)[] = [
  "legalName",
  "constitution",
  "established",
  "industry",
  "activity",
  "registeredAddress",
  "mysuruAddress",
  "pinCode",
  "udyam",
  "udyamDate",
  "classification",
  "pan",
  "employees",
  "locations",
  "repName",
  "repDesignation",
  "repEmail",
  "repMobile",
];

export function isBusinessProfileComplete(profile?: BusinessProfile | null) {
  if (!profile) return false;
  return PROFILE_REQUIRED_FIELDS.every((key) => String(profile[key] ?? "").trim().length > 0);
}

export type HelpTicket = {
  id: string;
  userId: string;
  topic: string;
  message: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  userId?: string;
  userName?: string;
  role?: string;
  action: string;
  applicationId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  at: string;
};

export type ResultLockState = {
  locked: boolean;
  lockedAt?: string;
  authAdminId?: string;
  authChairId?: string;
  categoryResults: {
    category: string;
    ranks: { rank: number; applicationId: string; org: string; finalScore: number; role: string }[];
  }[];
};

export type TieBreak = {
  id: string;
  applicationIds: [string, string];
  category: string;
  method: string;
  winnerId: string;
  recordedBy: string;
  at: string;
  reason: string;
};

function id() {
  return crypto.randomBytes(8).toString("hex");
}

function now() {
  return new Date().toISOString();
}

const users: User[] = [
  {
    id: "u-applicant",
    email: "ananya@example.com",
    mobile: "+919876543210",
    fullName: "Ananya Rao",
    designation: "Managing Director",
    password: "demo",
    roles: ["APPLICANT"],
    orgName: "Mysuru Precision Components Pvt. Ltd.",
    mfaEnabled: false,
  },
  {
    id: "u-admin",
    email: "admin@msmeawards.mysuru",
    fullName: "A. Iyer",
    designation: "Awards Administrator",
    password: "demo",
    roles: ["ADMINISTRATOR"],
    mfaEnabled: true,
    mfaSecret: "123456",
  },
  {
    id: "u-verify",
    email: "verify@msmeawards.mysuru",
    fullName: "V. Menon",
    designation: "Verification Lead",
    password: "demo",
    roles: ["VERIFICATION"],
    mfaEnabled: false,
  },
  {
    id: "u-jury1",
    email: "jury@msmeawards.mysuru",
    fullName: "Dr. S. Krishnan",
    designation: "Jury Member",
    password: "demo",
    roles: ["JURY"],
    mfaEnabled: true,
    mfaSecret: "123456",
    categoryCodes: ["MFG", "INN", "GRW"],
    expertise: "Manufacturing & operations",
    affiliation: "Industry",
    active: true,
  },
  {
    id: "u-jury2",
    email: "jury2@msmeawards.mysuru",
    fullName: "A. Natarajan",
    password: "demo",
    roles: ["JURY"],
    mfaEnabled: true,
    mfaSecret: "123456",
    categoryCodes: ["SRV", "EMP", "SSI"],
    expertise: "Services & people practices",
    affiliation: "Banking",
    active: true,
  },
  {
    id: "u-jury3",
    email: "jury3@msmeawards.mysuru",
    fullName: "M. Hegde",
    password: "demo",
    roles: ["JURY"],
    mfaEnabled: true,
    mfaSecret: "123456",
    categoryCodes: ["EMG", "WEN", "YEN", "INN"],
    expertise: "Entrepreneurship & innovation",
    affiliation: "Academia",
    active: true,
  },
  {
    id: "u-chair",
    email: "chair@msmeawards.mysuru",
    fullName: "Jury Chair",
    password: "demo",
    roles: ["JURY_CHAIR", "JURY"],
    mfaEnabled: true,
    mfaSecret: "123456",
    categoryCodes: ["MOTY", "MFG", "SRV", "EMG", "INN", "GRW", "WEN", "YEN", "SSI", "EMP"],
    expertise: "Grand Jury leadership",
    affiliation: "Industry",
    active: true,
  },
  {
    id: "u-observer",
    email: "observer@msmeawards.mysuru",
    fullName: "Process Observer",
    password: "demo",
    roles: ["OBSERVER"],
    mfaEnabled: false,
  },
];

const applications: Application[] = [
  {
    id: id(),
    applicationId: "MMA26-MFG-0047",
    categoryCode: "MFG",
    categorySlug: "manufacturing-excellence",
    categoryTitle: "Manufacturing Excellence Award",
    status: "JURY_EVALUATION",
    progress: 82,
    applicantId: "u-applicant",
    organisationName: "Mysuru Precision Components Pvt. Ltd.",
    sector: "Manufacturing",
    msme: "Small",
    submittedAt: "2026-03-12T10:00:00.000Z",
    assignedJuryIds: ["u-jury1", "u-jury2", "u-jury3"],
    commercialHidden: true,
    sponsorNote: "HIDDEN FROM JURY — Presenting Partner package purchased",
    evidenceStrength: "A",
    documentaryScore: 84,
    adminDecision: "ACCEPTED",
    verifiedAt: "2026-03-20T10:00:00.000Z",
    verifiedBy: "A. Iyer",
  },
  {
    id: id(),
    applicationId: "MMA26-INN-0012",
    categoryCode: "INN",
    categorySlug: "innovation-technology",
    categoryTitle: "Innovation & Technology Excellence Award",
    status: "CLARIFICATION_REQUIRED",
    progress: 64,
    applicantId: "u-applicant",
    organisationName: "Mysuru Precision Components Pvt. Ltd.",
    sector: "Technology",
    msme: "Small",
    submittedAt: "2026-03-14T10:00:00.000Z",
    assignedJuryIds: [],
    commercialHidden: true,
    evidenceStrength: "B",
    adminDecision: "PENDING",
  },
  {
    id: id(),
    applicationId: "MMA26-GRW-0033",
    categoryCode: "GRW",
    categorySlug: "growth-excellence",
    categoryTitle: "Growth Excellence Award",
    status: "READY_FOR_JURY",
    progress: 100,
    applicantId: "u-applicant",
    organisationName: "Kaveri Foods LLP",
    sector: "Food Processing",
    msme: "Medium",
    submittedAt: "2026-03-10T10:00:00.000Z",
    assignedJuryIds: [],
    commercialHidden: true,
    evidenceStrength: "A",
    adminDecision: "PENDING",
  },
  {
    id: id(),
    applicationId: "MMA26-SRV-0044",
    categoryCode: "SRV",
    categorySlug: "service-excellence",
    categoryTitle: "Service Excellence Award",
    status: "MODERATION_REQUIRED",
    progress: 100,
    applicantId: "u-applicant",
    organisationName: "Chamundi Digital Services",
    sector: "Services",
    msme: "Micro",
    submittedAt: "2026-03-08T10:00:00.000Z",
    assignedJuryIds: ["u-jury1", "u-jury2", "u-jury3"],
    commercialHidden: true,
    evidenceStrength: "C",
    adminDecision: "ACCEPTED",
    verifiedAt: "2026-03-15T10:00:00.000Z",
    verifiedBy: "A. Iyer",
  },
  {
    id: id(),
    applicationId: "MMA26-EMP-0091",
    categoryCode: "EMP",
    categorySlug: "employer-of-the-year",
    categoryTitle: "Employer Excellence Award",
    status: "ELIGIBILITY_REVIEW",
    progress: 100,
    applicantId: "u-applicant",
    organisationName: "Nanjangud Textiles",
    sector: "Textiles",
    msme: "Small",
    submittedAt: "2026-03-16T10:00:00.000Z",
    assignedJuryIds: [],
    commercialHidden: true,
    evidenceStrength: "B",
    adminDecision: "PENDING",
  },
  {
    id: id(),
    applicationId: "MMA26-WEN-0007",
    categoryCode: "WEN",
    categorySlug: "women-entrepreneur",
    categoryTitle: "Women Entrepreneur of the Year",
    status: "NOT_QUALIFIED",
    progress: 100,
    applicantId: "u-applicant",
    organisationName: "Sample Rejected Enterprise",
    sector: "Retail",
    msme: "Micro",
    submittedAt: "2026-03-05T10:00:00.000Z",
    assignedJuryIds: [],
    commercialHidden: true,
    adminDecision: "REJECTED",
    rejectionReason:
      "Substantial Mysuru District operations could not be verified from the documents submitted.",
    verifiedAt: "2026-03-18T12:00:00.000Z",
    verifiedBy: "A. Iyer",
  },
  {
    id: id(),
    applicationId: "MMA26-MFG-0021",
    categoryCode: "MFG",
    categorySlug: "manufacturing-excellence",
    categoryTitle: "Manufacturing Excellence Award",
    status: "FINALIST",
    progress: 100,
    applicantId: "u-applicant",
    organisationName: "Hebbal Components",
    sector: "Manufacturing",
    msme: "Small",
    submittedAt: "2026-03-01T10:00:00.000Z",
    assignedJuryIds: ["u-jury1", "u-jury2", "u-jury3"],
    commercialHidden: true,
    documentaryScore: 82,
    finalistScore: 78,
    finalScore: 80.8,
    rank: 2,
    evidenceStrength: "A",
    adminDecision: "ACCEPTED",
    verifiedAt: "2026-03-10T10:00:00.000Z",
    verifiedBy: "A. Iyer",
  },
];

const clarifications: Clarification[] = [
  {
    id: id(),
    applicationId: "MMA26-INN-0012",
    type: "Financial",
    title: "Additional information regarding reported revenue growth",
    deadline: "2026-03-28",
    requiredDocument: "FY-1 audited financial extract",
    status: "OPEN",
    thread: [
      {
        id: id(),
        at: "2026-03-20T09:00:00.000Z",
        by: "V. Menon",
        role: "VERIFICATION",
        body: "Please upload FY-1 audited financial extracts supporting the 34% revenue growth claim, or clarify if management-account based.",
      },
    ],
  },
];

const evaluations: Evaluation[] = [
  {
    id: id(),
    applicationId: "MMA26-SRV-0044",
    juryUserId: "u-jury1",
    juryName: "Dr. S. Krishnan",
    scores: [],
    totalScore: 91,
    lockedAt: "2026-04-05T10:00:00.000Z",
    recommendation: "Strongly Recommend",
  },
  {
    id: id(),
    applicationId: "MMA26-SRV-0044",
    juryUserId: "u-jury2",
    juryName: "A. Natarajan",
    scores: [],
    totalScore: 74,
    lockedAt: "2026-04-05T11:00:00.000Z",
    recommendation: "Recommend",
  },
  {
    id: id(),
    applicationId: "MMA26-SRV-0044",
    juryUserId: "u-jury3",
    juryName: "M. Hegde",
    scores: [],
    totalScore: 58,
    lockedAt: "2026-04-05T12:00:00.000Z",
    recommendation: "Neutral",
  },
];

const helpTickets: HelpTicket[] = [];
const businessProfiles: BusinessProfile[] = [
  {
    userId: "u-applicant",
    legalName: "Mysuru Precision Components Pvt. Ltd.",
    brandName: "MPC",
    constitution: "Private Limited Company",
    established: "2014-06-18",
    industry: "Manufacturing — Auto Components",
    activity: "Precision CNC machining for automotive and industrial OEMs",
    website: "https://example.com",
    linkedin: "https://linkedin.com/company/example",
    registeredAddress: "Hebbal Industrial Area, Mysuru",
    mysuruAddress: "Hebbal Industrial Area, Mysuru",
    pinCode: "570016",
    udyam: "UDYAM-KR-20-0012345",
    udyamDate: "2018-04-12",
    classification: "Small",
    pan: "AABCM1234F",
    gstin: "29AABCM1234F1Z5",
    cin: "U29100KA2014PTC012345",
    employees: "86",
    locations: "2",
    repName: "Ananya Rao",
    repDesignation: "Managing Director",
    repEmail: "ananya@example.com",
    repMobile: "+91 98765 43210",
    updatedAt: "2026-03-01T10:00:00.000Z",
    completedAt: "2026-03-01T10:00:00.000Z",
  },
];
const auditEvents: AuditEvent[] = [
  {
    id: id(),
    at: "2026-04-01T11:22:00.000Z",
    userId: "u-verify",
    userName: "V. Menon",
    role: "VERIFICATION",
    action: "Eligibility confirmed",
    applicationId: "MMA26-MFG-0047",
  },
  {
    id: id(),
    at: "2026-04-03T09:10:00.000Z",
    userId: "u-admin",
    userName: "A. Iyer",
    role: "ADMINISTRATOR",
    action: "Jury assignment (3 evaluators)",
    applicationId: "MMA26-MFG-0047",
  },
];
const notifications: Notification[] = [
  {
    id: id(),
    userId: "u-applicant",
    title: "Clarification requested",
    body: "MMA26-INN-0012 needs additional financial evidence.",
    read: false,
    at: now(),
  },
];
const tieBreaks: TieBreak[] = [];
const enquiries: unknown[] = [];
const partnerships: unknown[] = [];

let resultLock: ResultLockState = {
  locked: false,
  categoryResults: [
    {
      category: "Manufacturing Excellence Award",
      ranks: [
        {
          rank: 1,
          applicationId: "MMA26-MFG-0047",
          org: "Mysuru Precision Components Pvt. Ltd.",
          finalScore: 85.2,
          role: "WINNER",
        },
        {
          rank: 2,
          applicationId: "MMA26-MFG-0021",
          org: "Hebbal Components",
          finalScore: 82.1,
          role: "1st Runner-Up",
        },
        {
          rank: 3,
          applicationId: "MMA26-MFG-0060",
          org: "Cauvery Tooling",
          finalScore: 78.4,
          role: "2nd Runner-Up",
        },
        {
          rank: 4,
          applicationId: "MMA26-MFG-0011",
          org: "Nanjangud Alloys",
          finalScore: 74.0,
          role: "Official Finalist",
        },
        {
          rank: 5,
          applicationId: "MMA26-MFG-0039",
          org: "Srirangapatna Plastics",
          finalScore: 71.2,
          role: "Official Finalist",
        },
      ],
    },
  ],
};

const sessions = new Map<string, { userId: string; mfaOk: boolean; createdAt: number }>();
const pendingMfa = new Map<string, string>(); // challengeId -> userId

export const store = {
  id,
  now,
  users,
  applications,
  clarifications,
  evaluations,
  helpTickets,
  businessProfiles,
  auditEvents,
  notifications,
  tieBreaks,
  enquiries,
  partnerships,
  sessions,
  pendingMfa,
  get resultLock() {
    return resultLock;
  },
  setResultLock(next: ResultLockState) {
    resultLock = next;
  },
  audit(input: Omit<AuditEvent, "id" | "at"> & { at?: string }) {
    const event: AuditEvent = { id: id(), at: input.at ?? now(), ...input };
    auditEvents.unshift(event);
    return event;
  },
  notify(userId: string, title: string, body: string) {
    const n: Notification = { id: id(), userId, title, body, read: false, at: now() };
    notifications.unshift(n);
    return n;
  },
  findUserByEmail(email: string) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  findUser(id: string) {
    return users.find((u) => u.id === id);
  },
  findApp(applicationId: string) {
    return applications.find((a) => a.applicationId === applicationId);
  },
  findBusinessProfile(userId: string) {
    return businessProfiles.find((p) => p.userId === userId);
  },
  upsertBusinessProfile(
    userId: string,
    data: Omit<BusinessProfile, "userId" | "updatedAt" | "completedAt">,
  ) {
    const existing = businessProfiles.find((p) => p.userId === userId);
    const blank: BusinessProfile = {
      userId,
      legalName: "",
      brandName: "",
      constitution: "",
      established: "",
      industry: "",
      activity: "",
      website: "",
      linkedin: "",
      registeredAddress: "",
      mysuruAddress: "",
      pinCode: "",
      udyam: "",
      udyamDate: "",
      classification: "",
      pan: "",
      gstin: "",
      cin: "",
      employees: "",
      locations: "",
      repName: "",
      repDesignation: "",
      repEmail: "",
      repMobile: "",
    };
    const next: BusinessProfile = {
      ...blank,
      ...(existing ?? {}),
      ...data,
      userId,
      updatedAt: now(),
    };
    if (isBusinessProfileComplete(next)) {
      next.completedAt = existing?.completedAt ?? now();
    } else {
      next.completedAt = undefined;
    }
    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    businessProfiles.push(next);
    return next;
  },
  isBusinessProfileComplete,
  nextApplicationId(code: string) {
    const count = applications.filter((a) => a.categoryCode === code).length + 1;
    return `MMA26-${code}-${String(count).padStart(4, "0")}`;
  },
  aggregateScores(applicationId: string) {
    const list = evaluations.filter((e) => e.applicationId === applicationId && e.lockedAt);
    if (!list.length) return null;
    const totals = list.map((e) => e.totalScore).sort((a, b) => a - b);
    const avg = totals.reduce((s, n) => s + n, 0) / totals.length;
    const median =
      totals.length % 2
        ? totals[(totals.length - 1) / 2]
        : (totals[totals.length / 2 - 1] + totals[totals.length / 2]) / 2;
    const variance = Math.max(...totals) - Math.min(...totals);
    return {
      scores: list.map((e) => ({ judge: e.juryName, score: e.totalScore, id: e.id })),
      average: Number(avg.toFixed(2)),
      median,
      highest: Math.max(...totals),
      lowest: Math.min(...totals),
      variance,
      moderationRequired: variance > 20,
    };
  },
};
