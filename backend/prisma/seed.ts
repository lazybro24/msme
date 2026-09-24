import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed in production (would create known demo accounts). Set ALLOW_PROD_SEED=true only for a controlled one-time bootstrap.",
    );
  }

  const rawPassword = process.env.SEED_PASSWORD || "demo";
  if (process.env.NODE_ENV === "production" && rawPassword === "demo") {
    throw new Error("Set a strong SEED_PASSWORD when seeding production. Refusing password 'demo'.");
  }
  const passwordHash = await hashPassword(rawPassword);

  const users = [
    {
      email: "ananya@example.com",
      fullName: "Ananya Rao",
      designation: "Managing Director",
      orgName: "Mysuru Precision Components Pvt. Ltd.",
      mobile: "+919876543210",
      roles: ["APPLICANT"] as const,
      mfaEnabled: false,
    },
    {
      email: "admin@msmeawards.mysuru",
      fullName: "A. Iyer",
      designation: "Awards Administrator",
      roles: ["ADMINISTRATOR"] as const,
      mfaEnabled: true,
      mfaSecret: "123456",
    },
    {
      email: "verify@msmeawards.mysuru",
      fullName: "V. Menon",
      designation: "Verification Officer",
      roles: ["VERIFICATION"] as const,
      mfaEnabled: false,
    },
    {
      email: "jury1@msmeawards.mysuru",
      fullName: "Dr. S. Krishnan",
      designation: "Jury",
      roles: ["JURY"] as const,
      mfaEnabled: false,
      categoryCodes: ["MFG", "INN", "SRV"],
      expertise: "Manufacturing & operations",
      affiliation: "Industry",
    },
    {
      email: "chair@msmeawards.mysuru",
      fullName: "Prof. N. Rao",
      designation: "Jury Chair",
      roles: ["JURY_CHAIR", "JURY"] as const,
      mfaEnabled: true,
      mfaSecret: "123456",
      categoryCodes: ["MFG", "INN", "SRV", "MOTY"],
      expertise: "Grand Jury leadership",
      affiliation: "Academia",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        fullName: u.fullName,
        designation: u.designation,
        orgName: "orgName" in u ? u.orgName : undefined,
        mobile: "mobile" in u ? u.mobile : undefined,
        passwordHash,
        roles: [...u.roles],
        mfaEnabled: u.mfaEnabled,
        mfaSecret: "mfaSecret" in u ? u.mfaSecret : undefined,
        categoryCodes: "categoryCodes" in u ? [...u.categoryCodes!] : [],
        expertise: "expertise" in u ? u.expertise : undefined,
        affiliation: "affiliation" in u ? u.affiliation : undefined,
        active: true,
      },
      update: {
        passwordHash,
        roles: [...u.roles],
        mfaEnabled: u.mfaEnabled,
        active: true,
        categoryCodes: "categoryCodes" in u ? [...u.categoryCodes!] : [],
        expertise: "expertise" in u ? u.expertise : undefined,
        affiliation: "affiliation" in u ? u.affiliation : undefined,
      },
    });
  }

  const applicant = await prisma.user.findUniqueOrThrow({
    where: { email: "ananya@example.com" },
  });
  const jury = await prisma.user.findUniqueOrThrow({
    where: { email: "jury1@msmeawards.mysuru" },
  });
  const chair = await prisma.user.findUniqueOrThrow({
    where: { email: "chair@msmeawards.mysuru" },
  });

  const org = await prisma.organisation.upsert({
    where: { ownerId: applicant.id },
    create: {
      ownerId: applicant.id,
      legalName: "Mysuru Precision Components Pvt. Ltd.",
      brandName: "MPC",
      constitution: "Private Limited",
      established: "2012",
      industry: "Manufacturing",
      activity: "Precision CNC components for automotive and aerospace",
      website: "https://example.com/mpc",
      registeredAddress: "Hebbal Industrial Area, Mysuru",
      mysuruAddress: "Plot 42, Hebbal Industrial Area, Mysuru 570016",
      pinCode: "570016",
      udyam: "UDYAM-KR-20-0012345",
      udyamDate: "2021-06-15",
      classification: "Medium",
      pan: "AABCM1234D",
      gstin: "29AABCM1234D1Z5",
      employees: "186",
      locations: "Mysuru (HQ), Bengaluru warehouse",
      repName: "Ananya Rao",
      repDesignation: "Managing Director",
      repEmail: "ananya@example.com",
      repMobile: "+919876543210",
      completedAt: new Date(),
    },
    update: {
      legalName: "Mysuru Precision Components Pvt. Ltd.",
      activity: "Precision CNC components for automotive and aerospace",
      mysuruAddress: "Plot 42, Hebbal Industrial Area, Mysuru 570016",
      classification: "Medium",
      employees: "186",
      completedAt: new Date(),
    },
  });

  const draftJson = {
    step: 10,
    overview: {
      business:
        "MPC manufactures high-tolerance CNC-machined components for Tier-1 automotive and aerospace suppliers, with in-house tooling and QA.",
      products: "Shafts, housings, aerospace brackets, and precision fixtures.",
      markets: "Domestic OEMs and export to EU via distributor partners.",
      differentiation: "Closed-loop quality, 48-hour prototype turnaround, Mysuru-rooted skilled workforce.",
      achievements:
        "ISO 9001 + IATF 16949; 34% revenue growth FY-1; 40 apprentices trained under NSDC partnership.",
    },
    signature: {
      achievement:
        "Commissioned a 5-axis machining cell and reduced scrap rate from 3.2% to 0.9% within 12 months.",
    },
    performance: {
      revenueFY3: "18.2 Cr",
      revenueFY2: "22.4 Cr",
      revenueFY1: "30.1 Cr",
      employeesFY3: "142",
      employeesFY2: "161",
      employeesFY1: "186",
      customersFY1: "28 active OEM accounts",
      investment: "₹4.8 Cr in machining cell and metrology lab",
      newMarkets: "Entered two aerospace Tier-2 programmes",
    },
    category: {
      "Operational Excellence":
        "Lean cells, OEE dashboard, daily Gemba walks; scrap down to 0.9%.",
      "Quality & Process Capability":
        "IATF QMS, SPC on critical CTQs, calibrated CMM lab.",
      "People & Safety":
        "Zero LTI last 18 months; structured apprenticeship with local ITI.",
      "Customer Impact":
        "On-time delivery 97%; two customer quality awards in FY-1.",
      "Innovation / Improvement":
        "In-house fixture design reduced setup time by 28%.",
    },
    mysuru: {
      contribution:
        "HQ and primary plant in Hebbal; 90%+ workforce from Mysuru district; partnered with local ITI for apprenticeships.",
    },
  };

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 21);

  const app = await prisma.application.upsert({
    where: { applicationId: "MMA26-MFG-0001" },
    create: {
      applicationId: "MMA26-MFG-0001",
      categoryCode: "MFG",
      categorySlug: "manufacturing-excellence",
      categoryTitle: "Manufacturing Excellence",
      status: "JURY_EVALUATION",
      progress: 100,
      draftJson,
      submittedAt: new Date(),
      applicantId: applicant.id,
      organisationId: org.id,
      organisationName: org.legalName,
      sector: "Manufacturing",
      msme: "Medium",
      assignedJuryIds: [jury.id, chair.id],
      adminDecision: "ACCEPTED",
      verifiedAt: new Date(),
      verifiedBy: "A. Iyer",
      evaluationDeadline: deadline,
    },
    update: {
      status: "JURY_EVALUATION",
      progress: 100,
      draftJson,
      organisationId: org.id,
      organisationName: org.legalName,
      assignedJuryIds: [jury.id, chair.id],
      adminDecision: "ACCEPTED",
      verifiedAt: new Date(),
      verifiedBy: "A. Iyer",
      evaluationDeadline: deadline,
      rejectionReason: null,
    },
  });

  await prisma.document.deleteMany({ where: { applicationId: app.id } });
  await prisma.document.createMany({
    data: [
      {
        applicationId: app.id,
        organisationId: org.id,
        name: "Udyam Certificate",
        evidenceType: "Statutory",
        period: "Current",
        description: "UDYAM-KR-20-0012345",
        visibility: "Confidential",
        fileUrl: null,
      },
      {
        applicationId: app.id,
        organisationId: org.id,
        name: "PAN",
        evidenceType: "Statutory",
        period: "Current",
        description: "Company PAN card",
        visibility: "Confidential",
        fileUrl: null,
      },
      {
        applicationId: app.id,
        organisationId: org.id,
        name: "GST Certificate",
        evidenceType: "Statutory",
        period: "Current",
        description: "GST registration",
        visibility: "Confidential",
        fileUrl: null,
      },
      {
        applicationId: app.id,
        organisationId: org.id,
        name: "Financial / Performance Evidence",
        evidenceType: "Financial",
        period: "FY-1",
        description: "Revenue and EBITDA summary (confidential)",
        visibility: "Confidential",
        fileUrl: null,
      },
    ],
  });

  await prisma.siteSetting.upsert({
    where: { key: "nominationsOpen" },
    create: { key: "nominationsOpen", value: true },
    update: {},
  });
  await prisma.siteSetting.upsert({
    where: { key: "registrationOpen" },
    create: { key: "registrationOpen", value: true },
    update: {},
  });

  const docReqs = [
    "Udyam Certificate",
    "PAN",
    "GST Certificate",
    "Incorporation / Registration Proof",
    "Proof of Mysuru Operations",
    "Financial / Performance Evidence",
    "Authorized Applicant Declaration",
  ];
  for (let i = 0; i < docReqs.length; i++) {
    await prisma.documentRequirement.upsert({
      where: { name: docReqs[i] },
      create: {
        name: docReqs[i],
        evidenceType: docReqs[i].includes("Financial")
          ? "Financial"
          : docReqs[i].includes("Mysuru")
            ? "Operational"
            : "Statutory",
        mandatory: true,
        sortOrder: i,
        active: true,
      },
      update: { sortOrder: i, active: true, mandatory: true },
    });
  }

  const faqSeed = [
    ["What are Mysuru MSME Awards 2026?", "A business recognition and growth platform for outstanding Mysuru MSMEs."],
    ["Is there a nomination fee?", "No. Nomination is free (₹0)."],
    ["How many categories can my company enter?", "Maximum of two directly applicable categories."],
  ];
  for (let i = 0; i < faqSeed.length; i++) {
    const key = `faq:${i + 1}`;
    await prisma.cmsEntry.upsert({
      where: { key },
      create: {
        key,
        type: "FAQ",
        title: faqSeed[i][0],
        body: faqSeed[i][1],
        published: true,
        sortOrder: i,
      },
      update: { title: faqSeed[i][0], body: faqSeed[i][1] },
    });
  }

  await prisma.cmsEntry.upsert({
    where: { key: "page:integrity" },
    create: {
      key: "page:integrity",
      type: "PAGE",
      title: "Integrity Charter",
      body: "Awards cannot be purchased. Nominations are free. No public voting. Sponsors cannot influence winners.",
      published: true,
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.cmsEntry.upsert({
    where: { key: "page:event" },
    create: {
      key: "page:event",
      type: "PAGE",
      title: "Event overview",
      body: "Learn, Connect, Grow and Celebrate — MSME Growth Summit, Business Connect and Awards Night (date TBA).",
      published: true,
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.cmsEntry.upsert({
    where: { key: "page:partners" },
    create: {
      key: "page:partners",
      type: "PAGE",
      title: "Partners",
      body: "Banks, technology companies, corporates and ecosystem institutions may partner without influencing award outcomes.",
      published: true,
      sortOrder: 0,
    },
    update: {},
  });

  const cats = [
    { slug: "msme-of-the-year", code: "MOTY", number: "01", title: "MSME of the Year", directApply: false },
    { slug: "manufacturing-excellence", code: "MFG", number: "02", title: "Manufacturing Excellence Award", directApply: true },
    { slug: "service-excellence", code: "SRV", number: "03", title: "Service Excellence Award", directApply: true },
    { slug: "emerging-msme", code: "EMG", number: "04", title: "Emerging MSME Award", directApply: true },
    { slug: "innovation-technology", code: "INN", number: "05", title: "Innovation & Technology Award", directApply: true },
    { slug: "growth-excellence", code: "GRW", number: "06", title: "Growth Excellence Award", directApply: true },
    { slug: "women-entrepreneur", code: "WEN", number: "07", title: "Women Entrepreneur Award", directApply: true },
    { slug: "young-entrepreneur", code: "YEN", number: "08", title: "Young Entrepreneur Award", directApply: true },
    { slug: "sustainability-social-impact", code: "SSI", number: "09", title: "Sustainability & Social Impact Award", directApply: true },
    { slug: "employer-of-the-year", code: "EMP", number: "10", title: "Employer of the Year Award", directApply: true },
  ];
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i];
    await prisma.categoryConfig.upsert({
      where: { slug: c.slug },
      create: {
        ...c,
        tagline: c.title,
        overview: `${c.title} — editable from Admin CMS.`,
        eligibility: "Valid Udyam · Mysuru operations · Category fit",
        criteria: "See official scorecard",
        evidence: "Statutory + category evidence pack",
        published: true,
        sortOrder: i,
      },
      update: { title: c.title, code: c.code, number: c.number, directApply: c.directApply },
    });
  }

  console.log(
    "Seeded demo users (password: demo) + sample MFG application MMA26-MFG-0001 + admin CMS defaults.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
