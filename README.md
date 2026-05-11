# ysu-client

> [English](README.md) | [中文](README.zh-CN.md)

> **YSU Terminal** — a third-party web client for Yanshan University's
> online systems.

Built on Next.js 16 + React 19 + shadcn/ui, backed by
[`ysu-api`](../ysu-api). Covers CAS login, academic-system queries, and
one-click course evaluation. The current scope is the academic system;
the name was chosen with headroom so that future integrations (library,
campus card, etc.) won't require a rename.

> ⚠️ **Third-party client, not affiliated with Yanshan University.**
> For personal study and reference only. Using it implies acceptance of
> the associated risks. Do not use it to infringe on others' rights or
> in ways that violate university rules.

## Features

- **Authentication.** CAS login with automatic handling of CAPTCHA and
  SMS / cpdaily MFA. Optional "remember password".
- **Overview.** Current teaching week, today's classes (with the active
  and past periods highlighted), upcoming exams, and a GPA snapshot.
- **Grades.** Filter by term / course name. Drill into a single course
  for stats, grade distribution, and personal ranking — both at the
  teaching-class and whole-course level.
- **Credits & GPA.** Required / elective / degree-course credits with
  initial and best-attempt GPAs.
- **Schedule.** Lecture timetable merged with experiment/lab choices,
  switchable by teaching week, with overlapping-class handling.
- **Exams.** Per-term view, separating upcoming and finished exams.
- **Training plan.** Course list, academic completion progress, and
  academic-warning flags.
- **Course evaluation.** Single-choice, multi-choice, and free-text
  questions; one-click "fill with the highest score". **Batch
  evaluation** lets you select multiple tasks, auto-fill them, pre-check
  the resulting scores, double-confirm, then submit in a batch — with
  the option to abort midway.
- **UX.** i18n (中 / EN), dark / light / system themes (toggle with `d`),
  responsive desktop and mobile layouts, and a 24 h `localStorage` cache
  for faster repeat loads.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| View | React 19 + TypeScript 5.9 |
| UI | shadcn/ui (nova preset) + Tailwind CSS v4 |
| State | Zustand (with the `persist` middleware) |
| Theme | next-themes |
| Toasts | sonner |
| Drawers / overlays | radix-ui, vaul |
| Icons | lucide-react |

## Install

Requires Node.js ≥ 20. Either package manager works:

```bash
npm install
# or
pnpm install
```

## Run

```bash
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm run format       # Prettier
```

### Environment variables

Copy `.env.example` to `.env.local` (development) or `.env` (production)
and adjust as needed:

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:11920` | Base URL of the [`ysu-api`](../ysu-api) backend. Variables prefixed with `NEXT_PUBLIC_` are inlined into the client bundle. |

When deploying to a different host, set this to a URL the browser can
reach directly.

## Contract with the backend

ysu-client assumes the backend is [`ysu-api`](../ysu-api). All wire
details live in `lib/api.ts`:

- Credentials are sent via the `X-CAS-Credential` header and persisted
  in the browser under the `localStorage` key `ysu-auth` (zustand
  `persist`).
- The 24-hour data cache lives under `localStorage` keys `ysu-cache:*` —
  see `lib/cache.ts`.
- The error model follows ysu-api: branch on the response `code` (e.g.
  `NEED_CAPTCHA`, `MFA_REQUIRED`) and surface `detail` to the user
  directly.

## Directory layout

```
app/
├── layout.tsx              # root layout: i18n + theme + Tooltip + Toaster
├── page.tsx                # entry redirect (logged in → /dashboard, otherwise → /login)
├── login/                  # CAS login + MFA
└── dashboard/
    ├── layout.tsx          # auth guard, sidebar / topbar / bottom bar
    ├── page.tsx            # overview
    ├── grades/             # grades + stats modal
    ├── gpa/                # credits & GPA
    ├── schedule/           # timetable (desktop / mobile views + week switcher)
    ├── exams/              # exams
    ├── training-plan/      # training plan
    ├── evaluation/         # course evaluation (single / multi / text + batch auto-fill)
    ├── student/            # student profile (modal)
    └── me/                 # "Me" entry (mobile)
components/
├── ui/                     # shadcn/ui primitives
├── mobile-bottom-nav.tsx   # mobile bottom navigation
├── mobile-top-bar.tsx      # mobile top bar (dynamic right-slot)
├── refresh-indicator.tsx   # refresh animation for second loads
├── responsive-modal.tsx    # desktop Dialog / mobile Drawer adapter
└── theme-provider.tsx      # next-themes wrapper with `d` to toggle
hooks/
└── use-mobile.ts           # responsive breakpoint
lib/
├── api.ts                  # ysu-api fetch client
├── auth-store.ts           # auth zustand store (persisted to localStorage)
├── cache.ts                # 24 h TTL local cache
├── mobile-header-store.ts  # per-page right-slot for the mobile top bar
├── refresh-store.ts        # global refresh state
├── types.ts                # TypeScript contracts with the backend
└── i18n/                   # zh / en dictionaries + Context + useTranslation
```

## Security notes

- **Credential protection.** `credential` is equivalent to an active CAS
  session cookie; whoever holds it can impersonate the student. This
  client persists it to `localStorage`, so do **not** enable "remember
  password" on shared devices.
- **Remember password.** When enabled, the plaintext username and
  password are written to the `localStorage` key `ysu-login-remember` for
  auto-fill. Since the CAS flow always requires a fresh authentication,
  this is the highest convenience we can offer; if you need stronger
  guarantees, leave it unchecked.
- **Backend trust.** Whatever service `NEXT_PUBLIC_API_BASE` points at
  receives every credential. Only point it at a `ysu-api` instance you
  control, ideally over HTTPS.
- **CORS.** When the browser talks to the backend directly, allow-list
  the current origin via `YSU_API_CORS_ORIGINS` on the `ysu-api` side.

## License & disclaimer

The source code in this repository is released under the MIT License by
default (if the repo does not ship a separate `LICENSE` file, this
section is authoritative). The repository and its authors take **no
responsibility** for any account, data, disciplinary, or legal
consequences arising from using this client.
