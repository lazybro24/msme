# Mysuru MSME Awards 2026 — Technical Architecture

**Organizer:** Toya Corporate Consulting Services Pvt. Ltd.  
**Principle:** Simple to Enter. Serious to Win.  
**Governing flow:** Evidence → Independent Evaluation → Verification → Finalist Assessment → Result Lock

This document is the implementation plan for all three phases. Delivery is **strictly sequential**: Phase 1 ships complete before Phase 2, Phase 2 complete before Phase 3.

---

## 1. Stack (chosen)

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 15 App Router, TypeScript, single repo | One deployable, SEO for public site, Server Actions for portals, phased folders |
| UI | Tailwind CSS + shared design system | Fast public pages, mobile-first applicant flow |
| DB | PostgreSQL + Prisma | Relational workflows, constraints, audit history, category scorecards |
| Auth | Auth.js (NextAuth v5) | Credentials + email/mobile OTP; MFA added in Phase 3 |
| Files | S3-compatible object storage (MinIO local / AWS or R2 prod) | Encrypted-at-rest evidence, download controls for jury |
| Email | Transactional provider (Resend or SES) | Status, OTP, clarification, jury assignment |
| Jobs | Next.js after() / a small worker later | Email, snapshot generation, variance checks |
| Hosting | Node host with Postgres (e.g. Railway, Render, VPS) | Fits Windows-local + later production; no vendor lock to Supabase RLS |

**Not chosen:** separate NestJS API (slows Phase 1), Supabase-as-backend (Phase 3 score lock, dual-auth result lock, and commercial isolation are easier as explicit domain services).

---

## 2. Application surfaces

One Next.js app, three route groups, one database, **hard permission gates**.

```
src/app/
  (public)/          Phase 1  — marketing, SEO, enquiry forms
  (applicant)/       Phase 2  — /nominate portal
  (ops)/             Phase 2–3 secretariat + Phase 3 jury/observer
src/server/
  auth/              sessions, RBAC, MFA
  applications/      status machine
  evidence/
  jury/              assignment, scoring, variance, lock
  audit/
src/content/         award copy, FAQs, scorecard definitions (source of truth)
```

| URL | Audience | Phase |
| --- | --- | --- |
| `/` and content routes | Public | 1 |
| `/nominate` | Applicants | 2 |
| `/3e8e287e2388` | Admin + verification (obscure path; not public-linked) | 2 (intake) / 3 (full) |
| `/jury` | Jurors + chair | 3 |
| `/observer` | Process observer | 3 |

Nominate CTAs in Phase 1 link to `/nominate`. Until Phase 2 ships, that route is a **coming-soon / notify** page (not a fake login).

---

## 3. Roles and data visibility

| Role | Phase | Can | Cannot |
| --- | --- | --- | --- |
| Public | 1 | Read site, submit enquiry/partner forms | Applications, scores |
| Applicant | 2 | Own profile, max 2 drafts/submissions, clarifications, status | Jury scores, rankings, other applicants |
| Verification | 2–3 | Eligibility, evidence, clarifications | Scoring, commercial CRM |
| Awards Administrator | 2–3 | Workflow, assignment, config | Directly edit submitted jury scores |
| Jury member | 3 | Assigned apps after COI = No | Other scores before own submit; commercial data; unassigned apps |
| Jury Chair | 3 | Moderation, Grand Jury | Silent score edits without reopen audit |
| Process Observer | 3 | Read process/audit/results records | Choose winners, mutate scores |

**Hard rule:** sponsorship, ads, booths, delegate packages, Toya commercial relationship, and nominator identity live in a **separate Prisma schema or database role** (`commercial`). Jury queries never join that schema.

---

## 4. Status machine (applications)

```
Draft → Submitted → EligibilityReview → ClarificationRequired*
      → Verification → Qualified → ReadyForJury
                    → NotQualified | Disqualified

Phase 3 continues:
ReadyForJury → JuryEvaluation → ModerationRequired*
            → DocumentaryComplete → FinalistDueDiligence
            → Finalist → FinalAssessment → RankingReady → ResultLocked
```

Submitted content is **frozen** (immutable snapshot JSON + file keys). Secretariat reopen is an audited exception, not an edit-in-place.

Application IDs: `MMA26-{CAT}-NNNN`  
`MFG SRV EMG INN GRW WEN YEN SSI EMP` (MSME of the Year is qualification-based, no direct apply).

---

## 5. Domain model (core)

```
User, Session, OtpChallenge, RoleBinding
Organisation (business profile, reused across 2 apps)
Application (category, status, snapshotAt, applicationId)
ApplicationAnswer (section, criterionKey, text)
EvidenceAsset (type, period, confidential, strength A–D later)
EvidenceLink (answerId → asset)
Declaration
ClarificationThread / ClarificationMessage
EligibilityReview, VerificationRecord
JuryAssignment, ConflictDeclaration
Evaluation, CriterionScore (lockedAt)
ScoreSnapshot (immutable on submit/reopen)
ModerationCase
FinalistAssessment
CategoryRanking, ResultLock (dual authorizer)
AuditEvent (actor, role, action, before, after, reason, ip)
Enquiry, PartnershipRequest   // Phase 1
```

Scorecards live in versioned JSON (`src/content/scorecards/*.ts`) so jury UI and applicant questionnaires stay aligned.

---

## 6. Phase 1 — Public website (this delivery)

**In scope**

- Navigation: Home, About, Awards, Eligibility, Jury, Integrity, Event, Partners, FAQ, Contact
- CTAs: Nominate Now, Become a Partner
- Footer governance: Award Rules, Privacy, Terms, Integrity Charter
- All homepage sections and inner pages per Phase 1 content spec
- 10 award category pages (overview, eligibility, who should apply, criteria, evidence, recognition, apply)
- Eligibility finder (client questionnaire → recommended categories; disclaimer)
- Partners request form + Contact enquiry form (persisted)
- Mobile-responsive, SEO metadata, accessible headings
- `/nominate` placeholder pointing to Phase 2

**Out of scope for Phase 1**

- Applicant accounts, OTP, applications, uploads
- Secretariat/jury UIs
- Real event registration (date TBA)

**Forms:** Prisma + SQLite locally so Phase 1 runs without Docker; Postgres in `docker-compose` for Phase 2+. Same schema, swap `DATABASE_URL`.

---

## 7. Phase 2 — Applicant & nomination portal

- Register/login (email OTP required; mobile OTP preferred)
- Dashboard: applications 0/2, profile %, documents, status
- Business profile once; eligibility green/amber/red; category recommender
- 9 open categories; MSME of the Year locked
- 10-step workspace, autosave, Save Draft / Save & Continue
- Performance table + computed growth; confidential banner
- Per-criterion questions + claim-linked evidence
- Mysuru contribution, signature achievement, declaration, submit freeze
- Clarifications, notifications, finalist public profile
- Secretariat intake: eligibility checklist, clarification, status only (no scoring)
- Mobile: step N of 10, camera upload, large controls

---

## 8. Phase 3 — Secretariat & jury

- Five ops roles, MFA for admin and jury
- Verification + evidence strength A–D
- Assignment (≥3 jurors), COI gate before full dossier
- Independent scoring (guided scale), comments rules, score lock
- Variance → moderation; never auto-average extremes
- 70% documentary + 30% finalist assessment; thresholds 60 finalist / 70 podium
- Tie-break order recorded; Grand Jury MSME of the Year
- Dual-control result lock; post-lock immutability; ceremony export
- Full audit reconstructability

---

## 9. Security baseline

| Phase | Controls |
| --- | --- |
| 1 | HTTPS, form rate limits, no secrets in client, spam honeypot |
| 2 | Verified accounts, CSRF, signed uploads, virus-size limits, applicant isolation |
| 3 | MFA, short sessions, RBAC, object-storage signed URLs, download restrictions, audit, backups, no shared jury logins |

---

## 10. Open content gaps (do not block Phase 1)

Phase 1 category pages will use **published** eligibility/criteria from the Phase 1 doc plus reasonable placeholders where the Word files do not list full 100-point breakdowns (only Manufacturing is fully specified). Phase 2 questionnaires must be locked to the official scorecards before applications open.

Event date/venue and secretariat phone/email remain **TBA** until frozen.

---

## 11. Build order

1. Design system + Phase 1 routes + forms  
2. Postgres/Prisma core + Auth + applicant portal  
3. Secretariat verification  
4. Jury scoring, lock, Grand Jury, observer, ceremony export
