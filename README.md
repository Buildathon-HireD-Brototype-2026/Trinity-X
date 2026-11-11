<div align="center">

# 🔱 Trinity X

### A team of four, one buildathon, one project: **HireD**

*We came to build a platform. We left knowing how to build it as a team.*

![Flutter](https://img.shields.io/badge/Flutter-Driver%20App-02569B?logo=flutter&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express%20API-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white)
![Buildathon](https://img.shields.io/badge/HireD-Buildathon%202026-6A379F)

</div>

---

## 👋 About us

**Trinity X** is a four-member team that took part in the **HireD Buildathon 2026**.

The goal was not only to ship software. It was to learn how a real team ships software: how to share one codebase without breaking each other's work, how to turn a written requirements document into a working system, and how to use AI as a helper in development without handing it the steering wheel.

---

## 🎯 The project: HireD

Our buildathon project is **HireD**, built from a written requirements document (PRD) and technical guidelines. We planned it, split it into parts and built it together.

---

## 🧩 What we worked on

| Part | What it is |
|---|---|
| 🖥️ **Admin Portal** (web) | Web app for the admin side |
| 🏢 **B2B Portal** (web) | Web app for the business side |
| 📱 **Driver App** (Flutter) | Mobile app for drivers |
| ⚙️ **Backend API** (Node.js + Express) | REST API at `/api/v1` used by all three apps |
| 🗄️ **Database** (PostgreSQL + Prisma) | 15 tables, rules and an audit trail |

---

## 🛠️ Tech stack

| Layer | Choice |
|---|---|
| Mobile | Flutter (Dart), Material 3, Riverpod, go_router, dio |
| Web | Admin Portal and B2B Portal (see each folder) |
| Backend | Node.js, Express, REST (`/api/v1`) |
| Database | PostgreSQL 17, Prisma ORM, SQL migrations |
| API docs | OpenAPI 3.0 (works in Swagger UI) |
| Auth | JWT access token (15 min) + refresh token (7 days), bcrypt passwords |
| Workflow | Git, GitHub pull requests, feature branches |

---

## 📁 Repository layout

```
Trinity-X/
├── backend/          # Node.js + Express API, Prisma schema, migrations, seed
├── admin-portal/     # Web app for HireD admins
├── b2b-portal/       # Web app for the business side
├── driver-app/       # Flutter mobile app
├── docs/             # Database design, ER diagram, API (OpenAPI), guides
└── README.md
```

Every part has its own `.env.example` with placeholder values. Real secrets are never committed.

---

## 📚 What we learned

### 1. Git as a team, not alone

We started with one shared repository and four people who all wanted to push at once. That forced us to learn the habits that make teamwork safe:

- **Nobody pushes to `main`.** Every change goes through a branch and a **pull request** that someone else reviews.
- **One branch, one purpose.** Branches like `feature/home` or `docs/update-documents` keep changes small and easy to review.
- **Clear commit messages** with a type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. A good log reads like a story.
- **`.gitignore` and `.env.example`.** Secrets stay on your machine. The repo only shows what a variable is for.
- **`.gitkeep`** to keep empty folders so the project structure is visible from day one.
- **Pull before you branch, fetch before you check.** Most "my code vanished" moments are a missed pull.
- **Access tokens and roles.** Using a minimal-scope token, and giving teammates the right role (writer, not admin).
- **Reading a review.** Our first database pull request came back with six review comments (normalization, naming, access control, audit trail, reports, indexes). Fixing them taught us more than the first draft did.

### 2. Using AI in development, with knowledge in the driver's seat

We used AI assistants every day. The big lesson: **AI is fast, but it needs a boss, and the boss is a written requirement.**

- **A prompt is a specification.** We wrote strict prompts: work only inside your folder and branch, do not add features, read the PRD first, summarise what you understood, then ask questions before building.
- **"No extra features" is a rule worth writing down.** Left alone, an assistant happily adds packages, screens and ideas nobody asked for.
- **Make it prove it.** We cross-checked AI output against the source documents: every table and column of the database against the design, every requirement ID against an endpoint. Checking found real mistakes, so we kept doing it.
- **Tests first.** We asked for test cases and scenarios before a feature is called done, so "it looks fine" is never the only proof.
- **One assistant per area.** The Flutter app, the web portals and the docs each had their own instructions and their own branch, so the work stayed separate.
- **A second chat as the tester.** One AI builds, another only tests and reports, and never changes code.
- **Humans decide.** The assistant asks, the team answers. Open questions in the requirements were raised with the lead, not guessed by the AI.

### 3. Software engineering with just our software knowledge

We did not have a senior engineer on the team, only what we knew about software plus the willingness to look things up. With that we practised real engineering:

- **Design before code.** Database first: tables, keys, rules and an ER diagram, then the API, then the screens.
- **Normalization and naming conventions** (snake_case tables and columns, plural table names, kebab-case routes).
- **Money is exact.** `NUMERIC`, never floating point.
- **Concurrency.** A `version` column so two admins cannot silently overwrite each other.
- **Transactions.** Related changes are saved together or not at all.
- **Time zones.** Store UTC, convert for display.
- **API-first documentation** with OpenAPI, so the web and mobile developers can build against the same contract before the backend is finished.
- **Security basics:** hashed passwords, users see only their own data, signed file links, no raw database errors to users.

---

## 🔄 How we worked

```
        ┌──────────────┐
        │  PRD + docs  │   one source of truth
        └──────┬───────┘
               ▼
   feature branch (one per task)
               ▼
   build  →  test  →  commit (feat/fix/docs…)
               ▼
        Pull Request  →  review  →  fixes
               ▼
              merge
```

---

## 🚀 Getting started

> Each part has its own setup. Start with the part you want to run.

```bash
# 1. Clone
git clone https://github.com/Buildathon-HireD-Brototype-2026/Trinity-X.git
cd Trinity-X

# 2. Pick a branch to look at
git fetch origin
git checkout <branch-name>
git pull
```

| Part | Setup |
|---|---|
| `backend/` | Copy `.env.example` to `.env`, set `DATABASE_URL` and the JWT secrets, install packages, run the Prisma migrations, then start the server |
| `admin-portal/`, `b2b-portal/` | Copy `.env.example` to `.env`, set the API base URL, install packages, start the dev server |
| `driver-app/` | Copy `.env.example` to `.env` and set `API_BASE_URL`, run `flutter pub get`, then `flutter run`. On the Android emulator, `localhost` is `10.0.2.2` |

---

## 📖 Documentation

| Document | What is inside |
|---|---|
| `docs/database.md` | Database design: tables, rules, indexes, audit trail |
| `docs/er-diagram.pdf` | The ER diagram of all tables and relationships |
| `docs/openapi.json` | The API contract (OpenAPI 3.0). Open it in [Swagger Editor](https://editor.swagger.io/) or Swagger UI |

---

## 🙏 Thanks

To the **HireD buildathon** organisers for the project and the push to build something real. And to everyone who reviewed our pull requests and told us what we got wrong. That was the best part of the learning.

<div align="center">

**Built with curiosity by Trinity X** 🔱

</div>
