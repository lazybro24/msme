export type CategoryEvidenceItem = {
  document: string;
  purpose: string;
};

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
  /** Category-specific achievement & evidence requirements (5 areas). */
  supportingEvidence: CategoryEvidenceItem[];
  /** @deprecated Prefer supportingEvidence — short document titles for compact UI. */
  evidence: string[];
  evidenceNotes?: string[];
  recommendedAdditional?: string;
  juryFocus?: string;
  recognition: string[];
  directApply: boolean;
};

function withEvidenceLabels(
  items: CategoryEvidenceItem[],
): Pick<AwardCategory, "supportingEvidence" | "evidence"> {
  return {
    supportingEvidence: items,
    evidence: items.map((i) => i.document),
  };
}

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
    ...withEvidenceLabels([
      {
        document:
          "Three-Year Business Performance Report showing turnover, profitability and major business achievements, supported by financial records",
        purpose: "Establishes consistent overall performance",
      },
      {
        document:
          "Business Growth & Expansion Report with evidence of new markets, customers, branches, capacity or product lines",
        purpose: "Demonstrates sustainable growth",
      },
      {
        document:
          "Innovation & Competitive Advantage Portfolio containing implemented improvements, product developments or technology initiatives",
        purpose: "Establishes differentiation and innovation",
      },
      {
        document:
          "Employment & People Development Report with workforce growth, training initiatives and employment contributions",
        purpose: "Demonstrates people and economic impact",
      },
      {
        document:
          "Corporate Governance & Social Impact Report covering internal controls, responsible practices and measurable community/environmental initiatives",
        purpose: "Evaluates responsible leadership and wider impact",
      },
    ]),
    evidenceNotes: [
      "MSME of the Year is qualification-based and does not accept direct nominations.",
      "These documents should be requested only from enterprises shortlisted for Grand Jury consideration.",
      "Existing evidence from primary-category applications should be reused wherever possible.",
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
    ...withEvidenceLabels([
      {
        document:
          "Production Performance Report showing production volume, capacity utilisation and productivity improvements over the last 2–3 years",
        purpose: "Measures manufacturing efficiency",
      },
      {
        document:
          "Quality Assurance & Control Records, such as inspection reports, rejection rates, defect trends or ISO audit findings",
        purpose: "Establishes product quality and consistency",
      },
      {
        document:
          "Process Improvement / Automation Report with before-and-after results of implemented improvements",
        purpose: "Demonstrates operational innovation",
      },
      {
        document:
          "Machinery & Technology Investment Records, such as equipment purchase invoices, commissioning records or implementation reports",
        purpose: "Verifies manufacturing modernisation",
      },
      {
        document:
          "Workplace Safety & Operational Compliance Records, including safety audits, training records and applicable factory/environmental compliance evidence",
        purpose: "Establishes safe and responsible operations",
      },
    ]),
    recommendedAdditional:
      "Lean manufacturing certifications, Six Sigma projects, customer quality awards, energy-efficiency improvements or production-efficiency case studies.",
    juryFocus: "Productivity, quality, process innovation, operational efficiency and safety.",
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
    ...withEvidenceLabels([
      {
        document:
          "Customer Satisfaction Report supported by customer surveys, verified ratings, feedback summaries or NPS data",
        purpose: "Evaluates customer experience",
      },
      {
        document:
          "Client Retention & Repeat Business Report showing repeat customers, renewals or long-term client relationships",
        purpose: "Demonstrates service consistency",
      },
      {
        document:
          "Service Delivery Performance Report with turnaround times, service-level compliance, response times or completion rates",
        purpose: "Measures operational performance",
      },
      {
        document:
          "Customer Testimonials / Appreciation Letters, preferably dated and independently verifiable",
        purpose: "Supports service quality claims",
      },
      {
        document:
          "Service Improvement & Innovation Report showing improvements to service processes, technology, training or customer experience",
        purpose: "Establishes continuous improvement",
      },
    ]),
    recommendedAdditional:
      "Client contracts with sensitive terms redacted, service audit reports, complaint-resolution records, customer-experience certifications and service-quality awards.",
    juryFocus:
      "Customer satisfaction, service quality, retention, innovation and operational excellence.",
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
    ...withEvidenceLabels([
      {
        document:
          "Business Model & Value Proposition Report explaining the problem addressed, target customers, revenue model and competitive differentiation",
        purpose: "Evaluates business viability",
      },
      {
        document:
          "Market Traction Report supported by sales invoices, customer acquisition records, orders or subscription data",
        purpose: "Verifies actual market acceptance",
      },
      {
        document:
          "Business Growth Report Since Commencement showing revenue, customer growth and operational milestones",
        purpose: "Establishes early business performance",
      },
      {
        document:
          "Product / Service Validation Evidence, such as pilot results, customer acceptance letters, purchase orders or completed projects",
        purpose: "Demonstrates commercial validation",
      },
      {
        document:
          "Business Scalability & Expansion Plan supported by capacity plans, market research, pipeline evidence or implementation milestones",
        purpose: "Evaluates realistic future potential",
      },
    ]),
    recommendedAdditional:
      "Incubation completion certificates, accelerator participation, grants, startup competition recognition, investor commitments or product launch records.",
    juryFocus:
      "Market traction, differentiation, scalability, founder capability and financial sustainability.",
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
    ...withEvidenceLabels([
      {
        document:
          "Innovation Project Report describing the problem, proposed solution, development process and implementation",
        purpose: "Establishes the innovation",
      },
      {
        document:
          "Technology Implementation Evidence, such as deployment reports, system screenshots, commissioning certificates or implementation records",
        purpose: "Verifies practical adoption",
      },
      {
        document:
          "Before-and-After Impact Analysis demonstrating cost savings, productivity gains, time reduction, quality improvement or revenue impact",
        purpose: "Measures tangible results",
      },
      {
        document:
          "Product / Technology Validation Report, including pilot results, testing certificates, user acceptance reports or independent technical assessments",
        purpose: "Demonstrates functionality and reliability",
      },
      {
        document:
          "Intellectual Property or Innovation Ownership Evidence, such as patent filings, registered designs, software ownership declarations or documented original development",
        purpose: "Establishes ownership or legitimate use of innovation",
      },
    ]),
    evidenceNotes: [
      "A patent should not be mandatory. Genuine process innovation, automation, AI implementation and business-model innovation may be eligible without registered intellectual property.",
    ],
    juryFocus: "Originality, implementation, measurable impact, adoption and scalability.",
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
    ...withEvidenceLabels([
      {
        document:
          "Three-Year Revenue Growth Statement supported by audited financial statements, CA-certified figures or equivalent reliable records",
        purpose: "Verifies revenue growth",
      },
      {
        document:
          "Profitability & Financial Sustainability Report showing profit margins, operating performance and financial stability",
        purpose: "Evaluates quality of growth",
      },
      {
        document:
          "Customer & Market Expansion Report supported by customer acquisition records, new market sales or distribution agreements",
        purpose: "Demonstrates market expansion",
      },
      {
        document:
          "Business Capacity Expansion Evidence, including machinery investments, new facilities, branch openings or workforce expansion records",
        purpose: "Verifies operational scaling",
      },
      {
        document:
          "Growth Strategy & Achievement Report documenting growth initiatives, milestones, outcomes and future sustainability",
        purpose: "Evaluates how growth was achieved",
      },
    ]),
    recommendedAdditional:
      "Export records, major contracts, distribution agreements, new product launches and employment growth reports.",
    juryFocus:
      "Sustainable revenue growth, profitability, market expansion, employment and operational scalability.",
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
    ...withEvidenceLabels([
      {
        document:
          "Ownership & Leadership Evidence, such as shareholding records, partnership deed extracts or directorship records showing substantial ownership and active involvement",
        purpose: "Verifies entrepreneurial leadership",
      },
      {
        document:
          "Entrepreneurial Journey & Achievement Report outlining business establishment, challenges overcome and significant milestones",
        purpose: "Evaluates entrepreneurial achievement",
      },
      {
        document:
          "Business Performance & Growth Report supported by sales records, financial summaries and expansion achievements",
        purpose: "Demonstrates business success",
      },
      {
        document:
          "Leadership & Team Development Evidence, including organizational responsibilities, team development initiatives and employment contributions",
        purpose: "Establishes active leadership",
      },
      {
        document:
          "Innovation, Market Impact or Community Contribution Report supported by implemented initiatives, customer outcomes or community project records",
        purpose: "Demonstrates wider contribution",
      },
    ]),
    recommendedAdditional:
      "Leadership recognition, industry awards, mentoring initiatives, women-employment programs and verified media coverage.",
    evidenceNotes: [
      "The applicant must demonstrate meaningful entrepreneurial ownership and leadership. Merely having a woman listed as a director should not automatically qualify an enterprise.",
    ],
    juryFocus: "Leadership, business achievement, growth, resilience and entrepreneurial impact.",
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
    whoShouldApply: ["Young founders and business leaders with proven achievement"],
    criteria: [
      { name: "Entrepreneurial Achievement", points: 25 },
      { name: "Business Traction", points: 20 },
      { name: "Innovation & Ambition", points: 15 },
      { name: "Leadership Maturity", points: 15 },
      { name: "Scalability Potential", points: 15 },
      { name: "Mysuru Contribution", points: 10 },
    ],
    ...withEvidenceLabels([
      {
        document:
          "Entrepreneur Age Verification Document, such as an appropriate government-issued proof of date of birth",
        purpose: "Confirms age eligibility",
      },
      {
        document:
          "Founder / Ownership / Leadership Evidence, including incorporation records, shareholding extracts, partnership records or documented management responsibility",
        purpose: "Establishes genuine entrepreneurial involvement",
      },
      {
        document:
          "Business Achievement & Performance Report supported by revenue, customer growth, project delivery or business milestone evidence",
        purpose: "Measures entrepreneurial results",
      },
      {
        document:
          "Innovation & Business Development Portfolio showing new products, services, technology adoption or market development initiatives",
        purpose: "Demonstrates innovation and initiative",
      },
      {
        document:
          "Leadership & Business Expansion Report documenting team building, employment creation, strategic decisions and measurable expansion outcomes",
        purpose: "Evaluates leadership and growth potential",
      },
    ]),
    recommendedAdditional:
      "Startup recognition, accelerator participation, awards, innovation grants, customer acquisition milestones and business expansion records.",
    evidenceNotes: [
      "Date-of-birth evidence is a category-specific eligibility document. It should be treated as confidential and collected only when necessary.",
    ],
    juryFocus:
      "Entrepreneurial achievement, innovation, leadership, business performance and scalability.",
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
    ...withEvidenceLabels([
      {
        document:
          "Sustainability / Social Impact Project Report describing the initiative, objectives, beneficiaries and implementation period",
        purpose: "Establishes the initiative",
      },
      {
        document:
          "Measurable Impact Assessment Report showing environmental improvements or social outcomes with baseline and current measurements",
        purpose: "Verifies actual impact",
      },
      {
        document:
          "Environmental or Community Initiative Records, such as waste-management records, energy-saving reports, beneficiary registers or program completion reports",
        purpose: "Supports implementation claims",
      },
      {
        document:
          "Project Investment & Resource Allocation Evidence, including project expenditure statements, invoices, contribution records or resource-utilisation reports",
        purpose: "Demonstrates sustained commitment",
      },
      {
        document:
          "Independent Validation / Beneficiary Feedback Evidence, such as third-party assessments, beneficiary testimonials, institutional acknowledgements or relevant certifications",
        purpose: "Strengthens credibility of reported impact",
      },
    ]),
    recommendedAdditional:
      "Renewable-energy generation reports, water conservation records, waste-reduction data, community development partnerships and environmental audit findings.",
    evidenceNotes: [
      "Businesses should not need expensive ESG certifications to participate. Smaller MSMEs may demonstrate credible, measurable impact through operational records and independently verifiable outcomes.",
    ],
    juryFocus:
      "Measurable impact, continuity, responsible practices, innovation and contribution relative to enterprise size.",
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
    ...withEvidenceLabels([
      {
        document:
          "Employee Strength & Retention Report showing workforce numbers, hiring, attrition and retention trends for the last 2–3 years",
        purpose: "Measures employment stability",
      },
      {
        document:
          "Employee Training & Development Records, including training calendars, attendance records, certification summaries and skill-development initiatives",
        purpose: "Evaluates workforce development",
      },
      {
        document:
          "Employee Welfare & Benefits Documentation, including leave policies, insurance coverage, welfare initiatives and applicable employee benefit records",
        purpose: "Establishes employee support",
      },
      {
        document:
          "Employee Satisfaction & Workplace Culture Evidence, such as anonymized engagement surveys, feedback summaries or independent workplace assessments",
        purpose: "Evaluates employee experience",
      },
      {
        document:
          "HR Policies & Workplace Compliance Evidence, including grievance mechanisms, workplace safety procedures, anti-harassment policies where applicable and relevant compliance records",
        purpose: "Verifies responsible employment practices",
      },
    ]),
    recommendedAdditional:
      "Internal promotion statistics, employee recognition initiatives, diversity and inclusion programs, workplace safety awards and employee development case studies.",
    evidenceNotes: [
      "Employee personal information should be anonymized. Individual salary slips, medical records and other sensitive employee information should not be requested unless strictly necessary for a specific verification purpose.",
    ],
    juryFocus:
      "Workplace culture, employee engagement, retention, learning, welfare and responsible employment.",
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
