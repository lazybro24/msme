import { prisma } from "./prisma";

const FALLBACK_MANDATORY = [
  "Udyam Certificate",
  "PAN",
  "GST Certificate",
  "Incorporation / Registration Proof",
  "Proof of Mysuru Operations",
  "Financial / Performance Evidence",
  "Authorized Applicant Declaration",
] as const;

async function getMandatoryNames() {
  const rows = await prisma.documentRequirement.findMany({
    where: { active: true, mandatory: true },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length === 0) return [...FALLBACK_MANDATORY];
  return rows.map((r) => r.name);
}

function matchesMandatory(docName: string, mandatoryName: string) {
  const a = docName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const b = mandatoryName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  const bWords = b.split(" ").filter((w) => w.length > 2);
  if (!bWords.length) return false;
  return bWords.every((w) => aWords.has(w));
}

function isDocumentSatisfied(d: { fileUrl: string | null; fileName?: string | null }) {
  if (!d) return false;
  if (d.fileName === "N/A") return true;
  if (d.fileUrl && (d.fileUrl.startsWith("na:") || d.fileUrl === "na")) return true;
  return Boolean(d.fileUrl);
}

export async function getMandatoryDocumentStatus(applicantId: string, applicationCuid?: string) {
  const org = await prisma.organisation.findUnique({ where: { ownerId: applicantId } });
  const apps = await prisma.application.findMany({
    where: { applicantId },
    select: { id: true, applicationId: true },
  });
  const appIds = apps.flatMap((a) => [a.id, a.applicationId]);
  if (applicationCuid) appIds.push(applicationCuid);

  const docs = await prisma.document.findMany({
    where: {
      OR: [
        ...(org ? [{ organisationId: org.id }] : []),
        ...(appIds.length ? [{ applicationId: { in: appIds } }] : []),
      ],
    },
  });

  const mandatoryNames = await getMandatoryNames();
  const missing: string[] = [];
  let completeCount = 0;
  for (const name of mandatoryNames) {
    const match = docs.find((d) => matchesMandatory(d.name, name) && isDocumentSatisfied(d));
    if (match) completeCount += 1;
    else missing.push(name);
  }

  return {
    complete: missing.length === 0 && mandatoryNames.length > 0,
    completeCount,
    total: mandatoryNames.length,
    missing,
  };
}
