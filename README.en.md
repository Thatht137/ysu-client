<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="YSU Terminal icon" />
</p>

<h1 align="center">ysu-client</h1>

<p align="center">
  <a href="README.en.md">English</a> | <a href="README.md">中文</a>
</p>

> **YSU Terminal** — a third-party Android client for Yanshan University's
> online academic systems.

Built on Next.js 16 + React 19 + shadcn/ui, backed by
[`ysu-api`](../ysu-api). Covers CAS login, academic-system queries, and
one-click course evaluation. Packaged as an Android WebView app via
Capacitor with native HTTP bridging and OTA updates.

> **Third-party client, not affiliated with Yanshan University.**
> For personal study and reference only. Using it implies acceptance of
> the associated risks. Do not use it to infringe on others' rights or
> in ways that violate university rules.

## Features

- **CAS Authentication.** Login with automatic handling of CAPTCHA and
  SMS / cpdaily MFA. Session persisted across app restarts (CASTGC
  stored in localStorage, restored to native cookie store on Android).
- **Dashboard.** Current teaching week, today's classes (with active and
  past periods highlighted), upcoming exams, and a GPA snapshot.
- **Grades.** Filter by term / course name. Drill into a single course
  for stats, grade distribution, and personal ranking — both at the
  teaching-class and whole-course level.
- **Credits & GPA.** Required / elective / degree-course credits with
  initial and best-attempt GPAs.
- **Schedule.** Lecture timetable merged with experiment/lab choices,
  switchable by teaching week, with overlapping-class handling. Desktop
  and mobile layouts.
- **Exams.** Per-term view, separating upcoming and finished exams.
- **Training plan.** Course list, academic completion progress, and
  academic-warning flags.
- **Course evaluation.** Single-choice, multi-choice, and free-text
  questions; one-click "fill with the highest score". **Batch
  evaluation** lets you select multiple tasks, auto-fill them, pre-check
  the resulting scores, double-confirm, then submit in a batch — with
  the option to abort midway.
- **Android app.** Capacitor WebView shell with native HTTP bridging
  (bypasses WebView fetch limitations), persistent sessions, and
  OTA hot updates via @capgo/capacitor-updater.
- **UX.** i18n (中 / EN), dark / light / system themes (toggle with
  `d`), responsive desktop and mobile layouts, 24 h localStorage cache,
  and a stale-data indicator.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, static export) |
| View | React 19 + TypeScript 5.9 |
| UI | shadcn/ui (radix-nova preset) + Tailwind CSS v4 |
| State | Zustand (with the `persist` middleware) |
| Theme | next-themes |
| Toasts | sonner |
| Drawers / overlays | radix-ui, vaul |
| Icons | lucide-react |
| Mobile | Capacitor 8 (Android) |
| OTA updates | @capgo/capacitor-updater |

## Install

Requires Node.js >= 20. Either package manager works:

```bash
npm install
# or
pnpm install
```

## Run

```bash
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # production build (static export to dist/)
npm run start        # serve the production build
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm run format       # Prettier
```

### Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:11920` | Base URL of the [`ysu-api`](../ysu-api) backend. |

### Android build

```bash
npm run build        # static export to dist/
npx cap sync         # sync web assets + plugins to android/
npx cap open android # open in Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

OTA updates are pushed via `npm run release` which builds, creates a
GitHub release with the version tag, and uploads the artifact.

## Contract with the backend

ysu-client assumes the backend is [`ysu-api`](../ysu-api). All wire
details live in `lib/api.ts`:

- Credentials are sent via the `X-CAS-Credential` header and persisted
  in the browser under the `localStorage` key `ysu-auth` (zustand
  `persist`).
- 24-hour data cache lives under `localStorage` keys `ysu-cache:*` —
  see `lib/cache.ts`.
- Error model: branch on the response `code` (e.g. `NEED_CAPTCHA`,
  `MFA_REQUIRED`) and surface `detail` to the user directly.

## Directory layout

```
app/
├── layout.tsx              # root layout: i18n + theme + Tooltip + Toaster
├── page.tsx                # entry redirect (logged in → /dashboard, else → /login)
├── login/                  # CAS login + MFA
└── dashboard/
    ├── layout.tsx          # auth guard, sidebar / topbar / bottom bar
    ├── page.tsx            # overview
    ├── grades/             # grades + stats modal
    ├── gpa/                # credits & GPA
    ├── schedule/           # timetable (desktop / mobile views + week switcher)
    ├── exams/              # exams
    ├── training-plan/      # training plan
    ├── evaluation/         # course evaluation (single / multi / text + batch)
    ├── student/            # student profile (modal)
    ├── me/                 # "Me" entry (mobile)
    └── about/              # about page
components/
├── ui/                     # shadcn/ui primitives
├── mfa-modal.tsx           # MFA verification modal
├── mobile-bottom-nav.tsx   # mobile bottom navigation
├── mobile-top-bar.tsx      # mobile top bar (dynamic right-slot)
├── refresh-indicator.tsx   # refresh animation for second loads
├── responsive-modal.tsx    # desktop Dialog / mobile Drawer adapter
├── sdk-provider.tsx        # SDK initialization with hydration guard
├── stale-indicator.tsx     # stale-data banner
└── theme-provider.tsx      # next-themes wrapper with `d` to toggle
hooks/
└── use-mobile.ts           # responsive breakpoint
lib/
├── api.ts                  # ysu-api fetch client (withJWXT wrapper)
├── auth-store.ts           # auth zustand store (persisted to localStorage)
├── auto-login.ts           # auto-login logic
├── cache.ts                # 24h TTL local cache
├── cas.ts                  # CAS SSO: login, CAPTCHA, MFA, TGC persistence
├── cookie.ts               # RFC 6265 cookie jar + CapacitorHttp bridge
├── jwxt.ts                 # JWXT session management + auto-reauth
├── mfa-modal-store.ts      # MFA modal state
├── mobile-header-store.ts  # per-page right-slot for the mobile top bar
├── platform.ts             # platform detection (web vs native)
├── refresh-store.ts        # global refresh state
├── sdk.ts                  # SDK init / persist / reset
├── settings-store.ts       # user settings
├── types.ts                # TypeScript contracts with the backend
├── updater.ts              # Capacitor OTA updater logic
├── utils.ts                # general utilities (cn, etc.)
├── version.ts              # version display logic
└── i18n/                   # zh / en dictionaries + Context + useTranslation
android/                    # Capacitor Android project (Gradle)
scripts/
└── release.sh              # build + GitHub release automation
```

## Architecture notes

### HTTP layer (`lib/cookie.ts`)

Custom `SimpleCookieJar` (RFC 6265) with `fetchWithJar` for standard
fetch + cookie management. On Android, `capacitorHttpSend()` delegates
to `CapacitorHttp.request()` to bypass WebView fetch limitations on
`cer.ysu.edu.cn`. Cookies are synced between the JS jar and the native
cookie store via `CapacitorCookies.setCookie()`.

### Authentication (`lib/cas.ts`)

Full CAS SSO flow with CAPTCHA and MFA support. The CASTGC token is
persisted to localStorage and restored to the native cookie store on
startup so sessions survive app restarts.

### Session persistence (`lib/sdk.ts`)

`initSDK()` restores CAS and JWXT cookies from persisted state after
Zustand hydration. JWXT sessions are persisted after successful API
calls to avoid unnecessary re-authorization.

## Security notes

- **Credential protection.** `credential` is equivalent to an active CAS
  session cookie; whoever holds it can impersonate the student. This
  client persists it to `localStorage`, so do **not** enable "remember
  password" on shared devices.
- **Remember password.** When enabled, the plaintext username and
  password are written to the `localStorage` key `ysu-login-remember`
  for auto-fill. If you need stronger guarantees, leave it unchecked.
- **Backend trust.** Whatever service `NEXT_PUBLIC_API_BASE` points at
  receives every credential. Only point it at a `ysu-api` instance you
  control, ideally over HTTPS.
- **CORS.** When the browser talks to the backend directly, allow-list
  the current origin via `YSU_API_CORS_ORIGINS` on the `ysu-api` side.

## Compatibility

The Android app runs in a system WebView. If you experience rendering
issues, check that your WebView is up to date — **Chromium v111 or
later** is required. You can update Android System WebView from the
Play Store.

## License & disclaimer

The source code in this repository is released under the MIT License by
default (if the repo does not ship a separate `LICENSE` file, this
section is authoritative). The repository and its authors take **no
responsibility** for any account, data, disciplinary, or legal
consequences arising from using this client.
