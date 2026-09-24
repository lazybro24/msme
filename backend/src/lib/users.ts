import type { Role, User as DbUser, Organisation } from "@prisma/client";
import { prisma } from "./prisma";
import { parseFileRef, publicFilePath } from "./storage";

function normalizePhotoUrl(url?: string | null) {
  if (!url) return undefined;
  const ref = parseFileRef(url);
  return ref ? publicFilePath(ref.kind, ref.filename) : url;
}

/** Shape used by Express auth middleware and API responses */
export type AuthUser = {
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
  categoryCodes?: string[];
  expertise?: string;
  affiliation?: string;
  bio?: string;
  linkedin?: string;
  website?: string;
  photoUrl?: string;
  conductAcceptedAt?: string;
  active?: boolean;
  notes?: string;
};

export function toAuthUser(u: DbUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    mobile: u.mobile ?? undefined,
    fullName: u.fullName,
    designation: u.designation ?? undefined,
    password: u.passwordHash ?? "",
    roles: u.roles,
    orgName: u.orgName ?? undefined,
    mfaEnabled: u.mfaEnabled,
    mfaSecret: u.mfaSecret ?? undefined,
    recommendedSlugs: u.recommendedSlugs,
    categoryCodes: u.categoryCodes,
    expertise: u.expertise ?? undefined,
    affiliation: u.affiliation ?? undefined,
    bio: u.bio ?? undefined,
    linkedin: u.linkedin ?? undefined,
    website: u.website ?? undefined,
    photoUrl: normalizePhotoUrl(u.photoUrl),
    conductAcceptedAt: u.conductAcceptedAt?.toISOString(),
    active: u.active,
    notes: u.notes ?? undefined,
  };
}

export function publicUser(u: AuthUser) {
  return {
    id: u.id,
    email: u.email,
    mobile: u.mobile,
    fullName: u.fullName,
    designation: u.designation,
    roles: u.roles,
    orgName: u.orgName,
    mfaEnabled: u.mfaEnabled,
    recommendedSlugs: u.recommendedSlugs ?? [],
    categoryCodes: u.categoryCodes ?? [],
    expertise: u.expertise,
    affiliation: u.affiliation,
    bio: u.bio,
    linkedin: u.linkedin,
    website: u.website,
    photoUrl: u.photoUrl,
    conductAcceptedAt: u.conductAcceptedAt,
    active: u.active !== false,
    notes: u.notes,
  };
}

export const PROFILE_REQUIRED = [
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
] as const;

export type ProfilePayload = {
  legalName: string;
  brandName?: string;
  constitution: string;
  established: string;
  industry: string;
  activity: string;
  website?: string;
  linkedin?: string;
  registeredAddress: string;
  mysuruAddress: string;
  pinCode: string;
  udyam: string;
  udyamDate: string;
  classification: string;
  pan: string;
  gstin?: string;
  cin?: string;
  employees: string;
  locations: string;
  repName: string;
  repDesignation: string;
  repEmail: string;
  repMobile: string;
};

export function orgToProfile(org: Organisation | null) {
  if (!org) return null;
  return {
    userId: org.ownerId,
    legalName: org.legalName ?? "",
    brandName: org.brandName ?? "",
    constitution: org.constitution ?? "",
    established: org.established ?? "",
    industry: org.industry ?? "",
    activity: org.activity ?? "",
    website: org.website ?? "",
    linkedin: org.linkedin ?? "",
    registeredAddress: org.registeredAddress ?? "",
    mysuruAddress: org.mysuruAddress ?? "",
    pinCode: org.pinCode ?? "",
    udyam: org.udyam ?? "",
    udyamDate: org.udyamDate ?? "",
    classification: org.classification ?? "",
    pan: org.pan ?? "",
    gstin: org.gstin ?? "",
    cin: org.cin ?? "",
    employees: org.employees ?? "",
    locations: org.locations ?? "",
    repName: org.repName ?? "",
    repDesignation: org.repDesignation ?? "",
    repEmail: org.repEmail ?? "",
    repMobile: org.repMobile ?? "",
    completedAt: org.completedAt?.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export function isProfileComplete(org: Organisation | null) {
  if (!org) return false;
  const p = orgToProfile(org)!;
  return PROFILE_REQUIRED.every((k) => String(p[k] ?? "").trim().length > 0);
}

export async function notify(userId: string, title: string, body: string) {
  return prisma.notification.create({
    data: { userId, title, body },
  });
}

export async function audit(input: {
  actorId?: string;
  role?: string;
  action: string;
  applicationId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  reason?: string;
}) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      role: input.role,
      action: input.action,
      applicationId: input.applicationId,
      beforeJson: input.beforeJson as object | undefined,
      afterJson: input.afterJson as object | undefined,
      reason: input.reason,
    },
  });
}

export function appToApi(app: {
  id: string;
  applicationId: string;
  categoryCode: string;
  categorySlug: string;
  categoryTitle: string;
  status: string;
  progress: number;
  draftJson?: unknown;
  submittedAt?: Date | null;
  applicantId: string;
  organisationName?: string | null;
  sector?: string | null;
  msme?: string | null;
  assignedJuryIds: string[];
  adminDecision?: string | null;
  rejectionReason?: string | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
}) {
  return {
    id: app.id,
    applicationId: app.applicationId,
    categoryCode: app.categoryCode,
    categorySlug: app.categorySlug,
    categoryTitle: app.categoryTitle,
    status: app.status,
    progress: app.progress,
    draftJson: app.draftJson ?? undefined,
    submittedAt: app.submittedAt?.toISOString(),
    applicantId: app.applicantId,
    organisationName: app.organisationName ?? undefined,
    sector: app.sector ?? undefined,
    msme: app.msme ?? undefined,
    assignedJuryIds: app.assignedJuryIds,
    commercialHidden: true as const,
    adminDecision: app.adminDecision ?? "PENDING",
    rejectionReason: app.rejectionReason ?? undefined,
    verifiedAt: app.verifiedAt?.toISOString(),
    verifiedBy: app.verifiedBy ?? undefined,
  };
}

export async function nextApplicationId(code: string) {
  const count = await prisma.application.count({ where: { categoryCode: code } });
  return `MMA26-${code}-${String(count + 1).padStart(4, "0")}`;
}
