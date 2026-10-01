# Mysuru MSME Awards 2026

Separated **frontend** (Next.js) and **backend** (Express + Prisma + PostgreSQL).

```
msme/
├── frontend/     Next.js UI (port 3000)
├── backend/      Express API (port 4000)
├── docs/         Architecture notes
└── README.md
```

## What you need installed

### Already in this project (npm)

| Area | Packages |
| --- | --- |
| Frontend | Next.js, React, Tailwind, Framer Motion |
| Backend | Express, Zod, Prisma, **Resend** (email OTP), **bcryptjs**, **multer** (uploads) |

Run once per machine:

```powershell
cd f:\msme\frontend
npm install

cd f:\msme\backend
npm install
npx prisma generate
```

### System software (install on Windows)

| Software | Required? | Why |
| --- | --- | --- |
| **Node.js 18+** | Yes | Run frontend + backend |
| **PostgreSQL 14+** | Yes for Phase 2/3 persistence | Real applications, evidence, jury scores |
| **Resend API key** | For real email OTP | Register / login verification codes |
| Docker Desktop | Optional | Easiest way to run Postgres locally |

**Auth:** Email + password, then **email OTP** on every register/login. Set `RESEND_API_KEY` for real mail.

### Email (Resend — required for real OTP)

Edit `backend/.env`:

```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM=Mysuru MSME Awards <onboarding@resend.dev>
OTP_DEV_EXPOSE=true
```

Verify your domain at resend.com/domains to email any applicant (not only your Resend account email).  
Without Resend, local/dev can show demo OTP when `OTP_DEV_EXPOSE=true`.

### PostgreSQL (Neon)

Your `DATABASE_URL` should point at Neon. Then:

```powershell
cd f:\msme\backend
npx prisma db push
npm run db:seed
```

## Run (two terminals)

```powershell
# Terminal A
cd f:\msme\backend
npm run dev

# Terminal B
cd f:\msme\frontend
npm run dev
```

- UI: http://localhost:3000  
- API: http://localhost:4000/api/health  

## Phase status

| Phase | Status |
| --- | --- |
| 1 Public site | In place |
| 2 Applicant portal | Continuing (password auth + email OTP via Resend) |
| 3 Secretariat / Jury | UI + demo API present; harden next with Postgres + uploads |

## Useful URLs

| Surface | URL |
| --- | --- |
| Public site | http://localhost:3000 |
| Nominate | http://localhost:3000/nominate |
| Jury evaluate login | http://localhost:3000/jury-portal/login |
| Admin console (obscure path — do not publish) | http://localhost:3000/3e8e287e2388/login |
| API health | http://localhost:4000/api/health |

## Env files

- `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `backend/.env` → `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `RESEND_API_KEY`, `AUTH_SECRET`
- First admin (one-time): set `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`, start the API once, then remove the password from env — or run `npm run create-admin`
- Admin login: `/3e8e287e2388/login`
