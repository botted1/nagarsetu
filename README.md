# NagarSetu — Civic Grievance Router

*Nagar (नगर) "city" + Setu (सेतु) "bridge" — a bridge between citizens and the municipality.*

A 311-style civic grievance system for Indian cities. Citizens snap a photo and drop a pin; a Google ADK + Gemini agent classifies the issue, routes it to the right municipal department, drafts a formal complaint, and flags duplicates. Citizens track resolution; municipal admins triage and update status with email notifications at every step.

Built for a Google hackathon — the agent layer is **Google ADK (Python) + Gemini 2.5 Flash**, called from a **Next.js 16 / React 19** web app with **Prisma + SQLite**, **NextAuth v5 (magic links via Resend)**, and **Leaflet/OpenStreetMap**.

## Stack at a glance

| Layer | Choice |
| --- | --- |
| Web | Next.js 16 (App Router, RSC, Turbopack), TypeScript, Tailwind v4, shadcn-style UI, Framer Motion |
| DB | SQLite via Prisma 7 + better-sqlite3 driver adapter |
| Auth | NextAuth v5 — magic link via Resend (falls back to console-logged links in dev) |
| Storage | Google Cloud Storage in prod, `web/public/uploads/` fallback in dev |
| Email | Resend; falls back to terminal print in dev |
| Map | Leaflet + OpenStreetMap (no API key needed) |
| Agent | Python 3.11+ FastAPI service running a Google ADK Agent with 4 tools |
| AI | Gemini 2.5 Flash — vision-capable, **required** for live agent runs |

## Architecture

```
[Citizen / Admin browsers]
        │
        ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  Next.js 16 (App Router) │ ──────▶│  Python ADK Agent (FastAPI)
│  Prisma + SQLite         │        │  4 tools: classify /     │
│  NextAuth (magic link)   │        │  route / draft / dedup   │
│  Tailwind + shadcn-style │        │  Gemini 2.5 Flash        │
└──────────────────────────┘        └──────────────────────────┘
   │            │                                │
   ▼            ▼                                ▼
  GCS       Resend                      ◀── back to /api/grievance/similar
```

## Quickstart

### 1. Web app

```bash
cd web
pnpm install
pnpm prisma migrate dev --name init   # also generates the client
pnpm prisma db seed                    # 4 departments + admin + demo citizen
pnpm dev                               # http://localhost:3000
```

`web/.env` ships with sensible defaults; the only knob you may want to set is `ADMIN_EMAIL` so a magic-link sign-in promotes you to admin.

### 2. Agent service

```bash
cd agent_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
echo 'GEMINI_API_KEY="your-key"' > .env
echo 'WEB_APP_URL="http://localhost:3000"' >> .env
python main.py                         # http://localhost:8001
```

Get a Gemini API key at <https://aistudio.google.com/app/apikey>. The web app degrades gracefully (keyword-based classification + template complaint) if the agent service is unreachable.

### 3. Try it

1. Open <http://localhost:3000>, click **Report an issue**.
2. Sign in with any email (the magic link is printed to the `pnpm dev` terminal in dev mode).
3. Fill in the 3-step form, drop a pin, submit. The agent classifies, routes and drafts the complaint.
4. Sign out, sign back in with the email you set as `ADMIN_EMAIL` in `web/.env` — you'll land on the admin dashboard.
5. Change the status of a grievance; the citizen receives an email at every transition (also printed to terminal in dev).

## Department routing

Four departments are seeded:

- **Public Works** — roads, footpaths, drains, signage
- **Sanitation & Solid Waste** — garbage, public toilets, dump clearing
- **Electrical & Street Lighting** — streetlights, fallen wires, traffic signals
- **Water Supply & Sewerage** — leaks, pressure, sewer blocks, drinking-water issues

The agent picks one of these slugs via the `lookup_department` tool.

## Folder layout

```
smartci/
├── README.md
├── web/                    # Next.js 16 full-stack app
│   ├── app/                # routes (citizen + admin + api)
│   ├── components/         # ui primitives, map, form, timeline, status
│   ├── lib/                # db, auth, storage, email, agent client, departments
│   └── prisma/             # schema, migrations, seed
└── agent_service/          # Python FastAPI + Google ADK agent
    ├── agent.py            # Agent definition with 4 tools
    ├── tools.py            # lookup_department / draft_complaint / find_similar
    ├── departments.py      # mirror of the seeded department list
    └── main.py             # FastAPI wrapper exposing /process-grievance
```

## Dev fallbacks

The app should clone-and-run on a fresh laptop with just `pnpm install` and a Gemini API key. Each integration that needs a real cloud key has a graceful local fallback:

| Integration | Fallback when env var is missing |
| --- | --- |
| Resend (`RESEND_API_KEY`) | magic links + status emails are printed to the dev server terminal |
| GCS (`GCS_BUCKET`) | photos saved under `web/public/uploads/<date>/<id>.jpg` |
| Agent service (`AGENT_SERVICE_URL` unreachable) | keyword classifier + template complaint letter |

Gemini itself has no fallback — without an API key, the agent service's `/process-grievance` returns the local-template result.
