# Node.js + PostgreSQL — Full-stack demo on Clever Cloud

> A simple Express app connected to a PostgreSQL add-on, demonstrating Node.js + database deployment on Clever Cloud.

---

## Deploy on Clever Cloud

1. Fork this repository
2. In the Clever Cloud console, create a new **Node.js** application — connect your forked repo
3. Add a **PostgreSQL** add-on and link it to your app — `DATABASE_URL` is injected automatically
4. Set the required environment variables (see below)
5. Push → Clever Cloud deploys automatically

> **Why direct hostname?** The app uses the direct connection URI for reliable DB connections during deployment. Enable it in the add-on settings in the Clever Cloud console.

---

## Stack

| Layer     | Technology       |
|-----------|------------------|
| Runtime   | Node.js 20 LTS   |
| Framework | Express 5        |
| Database  | PostgreSQL       |
| Driver    | pg 8.20          |
| Design    | Clever Brand Kit (Plus Jakarta Sans, navy #13172e, dégradé Clever) |

---

## Features

- Add and delete items from a list
- PostgreSQL persistence via Clever Cloud add-on
- Auto-creates the table on first boot if it doesn't exist
- `/health` endpoint
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
cp .env.example .env
# Edit .env: set DATABASE_URL to your local PostgreSQL connection string
npm start
# → http://localhost:8080
```

---

## Environment Variables

| Variable                        | Required | Description                                              |
|---------------------------------|----------|----------------------------------------------------------|
| `POSTGRESQL_ADDON_DIRECT_URI`   | ✅       | Injected by Clever Cloud when add-on is linked           |
| `PORT`                          | auto     | Injected by Clever Cloud (default: 8080)                 |

---

## Deployment Notes

- The PostgreSQL add-on must have **"Direct hostname and port"** enabled — the app reads `POSTGRESQL_ADDON_DIRECT_URI`
- The table is created automatically at startup if it doesn't exist
- No migration tool needed — schema is managed in the app code
