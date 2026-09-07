# Node.js + PostgreSQL — Full-stack demo on Clever Cloud

> A simple Express app connected to a PostgreSQL add-on, demonstrating Node.js + database deployment on Clever Cloud.

---

## Deploy on Clever Cloud

1. Fork this repository
2. In the Clever Cloud console, create a new **Node.js** application — connect your forked repo
3. Add a **PostgreSQL** add-on and link it to your app — `POSTGRESQL_ADDON_URI` (and `POSTGRESQL_ADDON_DIRECT_URI` if direct access is enabled) are injected automatically
4. Set `NODE_ENV=production` and, recommended, `CC_HEALTH_CHECK_PATH=/health` (see below)
5. Push → Clever Cloud deploys automatically

> **Why direct hostname?** The app prefers the direct connection URI (`POSTGRESQL_ADDON_DIRECT_URI`) when available and falls back to `POSTGRESQL_ADDON_URI`. Enable "Direct hostname and port" in the add-on settings in the Clever Cloud console.

---

## Stack

| Layer     | Technology       |
|-----------|------------------|
| Runtime   | Node.js ≥ 20 (`engines.node: ">=20"` lets Clever Cloud pick its current default LTS) |
| Framework | Express 5        |
| Database  | PostgreSQL       |
| Driver    | pg 8.23          |
| Design    | Clever Brand Kit (Plus Jakarta Sans, navy #13172e, dégradé Clever) |

---

## Features

- Add and delete items from a list
- PostgreSQL persistence via Clever Cloud add-on
- Auto-creates the table on first boot if it doesn't exist
- `/health` endpoint: runs `SELECT 1` against PostgreSQL → `200 {status:"ok",db:"up"}` or `503 {status:"degraded"}`
- Server-side validation (string, trimmed, ≤ 32 chars; integer ids), real HTTP status codes, security headers (CSP, nosniff, Referrer-Policy, X-Frame-Options), graceful shutdown on `SIGTERM`
- Optional `GET /prime` CPU-load endpoint, only mounted when `ENABLE_PRIME=true`
- « Vu depuis Clever Cloud » panel: reads the variables injected by the platform (`CC_APP_NAME`, `APP_ID`, `INSTANCE_NUMBER`, `INSTANCE_TYPE`, `CC_PRETTY_INSTANCE_NAME`, `CC_COMMIT_ID`, `CC_DEPLOYMENT_ID`), plus PostgreSQL version and row count — shows « Local · hors Clever Cloud » when run outside the platform

---

## Certification Clever Cloud

The home page puts the **Clever Cloud certification** front and center (badge, the two official tracks and a call to action), right under the hero:

- **Cloud Computing Fundamentals** — concepts, architectures, IaaS · PaaS · FaaS models
- **Advanced Deployment** — mastering application deployment on Clever Cloud

Digital badges are issued automatically once a track is validated: [academy.clever.cloud](https://academy.clever.cloud/).

---

## Design

Shared **Clever Brand Kit**: `public/cc-brand.css` (tokens `--cc-*` and components, copied as-is — do not edit), inline SVG logo and certification badge in `views/partials/`, demo-specific styles in `public/demo.css`. Fonts: Plus Jakarta Sans + JetBrains Mono via Google Fonts, with system fallbacks. No new runtime dependency.

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### Run

```bash
git clone https://github.com/Vitiosum/demo-nodejs-postgresql
cd demo-nodejs-postgresql
npm install
POSTGRESQL_ADDON_URI=postgres://localhost:5432/demo_node npm start
# → http://localhost:3000   (override with PORT=8081 npm start)
```

The table `values` is created on first boot. No `.env` file is read: configuration comes from environment variables only, exactly as on Clever Cloud.

---

## Environment Variables

| Variable                        | Required    | Description                                                                 |
|---------------------------------|-------------|-----------------------------------------------------------------------------|
| `POSTGRESQL_ADDON_DIRECT_URI`   | preferred   | Injected by Clever Cloud when "Direct hostname and port" is enabled          |
| `POSTGRESQL_ADDON_URI`          | fallback    | Injected by Clever Cloud when the add-on is linked (used if no direct URI)   |
| `PORT`                          | auto        | Injected by Clever Cloud (8080); local default 3000                          |
| `NODE_ENV`                      | ✅ set it   | `production` on Clever Cloud (`clever env set NODE_ENV production`); only `development` renders stack traces |
| `PG_POOL_MAX`                   | optional    | Pool size per instance (default 4). Keep `PG_POOL_MAX × instances ≤` add-on connection limit (DEV plan = 5) |
| `ENABLE_PRIME`                  | optional    | `true` mounts `GET /prime` (CPU-bound, blocks the event loop ~8 s). Set only during a load demo, then remove |
| `CC_HEALTH_CHECK_PATH`          | recommended | `/health` so Clever Cloud monitors the DB-backed health endpoint             |

---

## Deployment Notes

- The app reads `POSTGRESQL_ADDON_DIRECT_URI` first and falls back to `POSTGRESQL_ADDON_URI`; enabling **"Direct hostname and port"** on the add-on is recommended
- The table is created automatically at startup if it doesn't exist; if the schema cannot be initialised the process exits with code 1 (fail-fast, visible in deployment logs)
- No migration tool needed — schema is managed in the app code
- Start command comes from `scripts.start` (`node ./bin/www`). `clevercloud/node.json` is historical and redundant with it (kept unchanged)
- On redeploy the platform sends `SIGTERM`: the server stops accepting connections, finishes in-flight requests and closes the PostgreSQL pool
