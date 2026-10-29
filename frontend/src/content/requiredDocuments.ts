/** Shared mandatory uploads required for every applicant (Documents step). */
export const mandatoryDocuments = [
  { name: "Udyam Certificate", evidenceType: "Statutory" },
  { name: "PAN", evidenceType: "Statutory" },
  { name: "GST Certificate", evidenceType: "Statutory" },
  { name: "Incorporation / Registration Proof", evidenceType: "Statutory" },
  { name: "Proof of Mysuru Operations", evidenceType: "Operational" },
  { name: "Financial / Performance Evidence", evidenceType: "Financial" },
  { name: "Authorized Applicant Declaration", evidenceType: "Statutory" },
] as const;

export type MandatoryDocument = (typeof mandatoryDocuments)[number];
