<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="YSU Terminal icon" />
</p>

<h1 align="center">ysu-client</h1>

<p align="center">
  <a href="README.md">首页</a> | <a href="README.zh-CN.md">中文详细文档</a>
</p>

> **YSU Terminal** — a third-party Android client for Yanshan University's
> online academic systems.

Built on Next.js 16 + React 19 + shadcn/ui, with business logic
referencing [ysu-sdk](https://github.com/Youwenqwq/ysu-sdk) and
[ysu-api](https://github.com/Youwenqwq/ysu-api). Covers CAS login,
academic-system queries, and one-click course evaluation. Packaged as
an Android WebView app via Capacitor with native HTTP bridging and OTA
updates.

> **Third-party client, not affiliated with Yanshan University.**
> For personal study and reference only. Using it implies acceptance of
> the associated risks. Do not use it to infringe on others' rights or
> in ways that violate university rules.

## Features

- **CAS Authentication.** Login with automatic handling of CAPTCHA and
  SMS / cpdaily MFA; built-in rate-limiting protects against frequent
  login attempts that could trigger security controls. Session persisted
  across app restarts (CASTGC stored encrypted via SecureStorage, restored
  to native cookie store on Android).
- **Dashboard.** Current teaching week, today's classes (with active and
  past periods highlighted), upcoming exams, and a GPA snapshot.
- **Grades.** Filter by term / course name. Drill into a single course
  for stats, grade distribution, and personal ranking — both at the
  teaching-class and whole-course level. Supports term GPA calculation
  and degree-course badges.
- **Credits & GPA.** Required / elective / degree-course credits with
  initial and best-attempt GPAs.
- **Schedule.** Lecture timetable merged with experiment/lab choices,
  switchable by teaching week, with overlapping-class handling. Real-time
  highlight of the current class, with lesson activity sign-in/out support.
  Desktop and mobile layouts.
- **Exams.** Per-term view, separating upcoming and finished exams.
- **Training plan.** Course list, academic completion progress, and
  academic-warning flags.
- **Course evaluation.** Single-choice, multi-choice, and free-text
  questions; one-click "fill with the highest score". **Batch
  evaluation** lets you select multiple tasks, auto-fill them, pre-check
  the resulting scores, double-confirm, then submit in a batch — with
  the option to abort midway.
- **Android app.** Capacitor WebView shell with native HTTP bridging
  (bypasses WebView fetch limitations), persistent sessions,
  OTA hot updates via @capgo/capacitor-updater, and APK shell
  version detection.
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

### Android build

```bash
npm run build        # static export to dist/
npx cap sync         # sync web assets + plugins to android/
npx cap open android # open in Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**;
or run `npm run release` to automate the static export, APK build, and
create a version-tagged GitHub Release.

OTA updates are also pushed via `npm run release`, which uploads artifacts
and generates `version.json` for APK shell version detection.

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
├── api.ts                  # academic-system API client
├── auth-store.ts           # auth zustand store (persisted to SecureStorage)
├── auto-login.ts           # auto-login logic
├── cache.ts                # 24h TTL local cache
├── cas.ts                  # CAS SSO: login, CAPTCHA, MFA, TGC persistence
├── cookie.ts               # RFC 6265 cookie jar + CapacitorHttp bridge
├── jwxt.ts                 # JWXT session management + auto-reauth
├── jwmobile.ts             # Today-campus mobile API wrapper
├── mfa-modal-store.ts      # MFA modal state
├── rate-limit.ts           # login rate limiting
├── mobile-header-store.ts  # per-page right-slot for the mobile top bar
├── platform.ts             # platform detection (web vs native)
├── refresh-store.ts        # global refresh state
├── sdk.ts                  # SDK init / persist / reset
├── secure-storage.ts       # SecureStorage wrapper (Android Keystore / iOS Keychain)
├── settings-store.ts       # user settings
├── types.ts                # TypeScript type definitions
├── update-store.ts         # update state management
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
stored encrypted via SecureStorage and restored to the native cookie
store on startup so sessions survive app restarts.

### Session persistence (`lib/sdk.ts`)

`initSDK()` restores CAS and JWXT cookies from persisted state after
Zustand hydration. JWXT sessions are persisted after successful API
calls to avoid unnecessary re-authorization.

## Security notes

- **Credential protection.** `credential` is equivalent to an active CAS
  session cookie; whoever holds it can impersonate the student. This
  client stores credentials encrypted via `@aparajita/capacitor-secure-storage`
  (Android Keystore / iOS Keychain). Do **not** enable "remember password"
  on shared devices.
- **Remember password.** When enabled, the username and password are
  stored encrypted via the system secure storage for auto-fill.

## Compatibility

The Android app runs in a system WebView. If you experience rendering
issues, check that your WebView is up to date — **Chromium v111 or
later** is required. You can update Android System WebView from the
Play Store.

## License & disclaimer

The source code in this repository is released under the
[GPL-3.0 License](LICENSE). The repository and its authors take **no
responsibility** for any account, data, disciplinary, or legal
consequences arising from using this client.
