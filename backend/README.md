# CrisisLoom

Production-ready backend API for coordinating shelters, volunteers, donors, and NGOs during disasters. CrisisLoom matches live resource needs to nearby people, pushes dashboard updates over WebSockets, and sends email/SMS alerts for critical shortages.

This is a strong 2026 backend portfolio project: it goes beyond CRUD into geospatial queries, event-driven jobs, RBAC, caching, and real-time systems.

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| API | Express.js + TypeScript |
| Database | MongoDB + Mongoose 8 (`2dsphere`) |
| Cache / queue | Redis + BullMQ |
| Real-time | Socket.IO |
| Auth | JWT access + refresh tokens, RBAC |
| Validation | Zod |
| Email / SMS | Nodemailer / Twilio |
| Docs | Swagger UI |
| Logs | Winston + request IDs |
| Deploy | Docker Compose |

## Architecture

```text
backend/src
  app.ts                 Express app
  server.ts              HTTP + Socket.IO + workers
  config/                env, MongoDB, Redis, logger
  models/                Mongoose schemas
  controllers/           HTTP handlers
  services/              business logic
  routes/                REST routes
  validators/            Zod schemas
  middleware/            auth, validation, errors, rate limits
  sockets/               live dashboard events
  queues/                BullMQ producers
  workers/               email, SMS, notification consumers
  events/                domain event helpers
  utils/                 ApiError, tokens, geo, pagination
  docs/                  OpenAPI spec
  scripts/seed.ts        demo data
```

## 11 modules

1. Foundation and infrastructure  
2. Authentication and RBAC  
3. User management  
4. Shelter management (geospatial)  
5. Volunteer management (geospatial)  
6. Donor management  
7. Disaster zones  
8. Resource inventory and requests  
9. Assignments and nearby matching  
10. Notifications, email, SMS, queues  
11. Real-time sockets, dashboard, logs, Docker, docs  

See [FEATURES.md](./FEATURES.md) for endpoint-level detail.

## Local setup

### Prerequisites

- Node.js 20+
- MongoDB running on `27017`
- Redis running on `6379`

Or use Docker for MongoDB and Redis only:

```bash
docker compose up mongo redis -d
```

### Install and run

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

API: `http://localhost:5000/api/v1`  
Swagger: `http://localhost:5000/api/docs`  
Health: `http://localhost:5000/api/v1/health`

### Seed demo data

```bash
npm run seed
```

| Role | Email | Password |
| --- | --- | --- |
| Admin | `SEED_ADMIN_EMAIL` in `.env` (default `admin@crisisloom.local`) | `SEED_ADMIN_PASSWORD` |
| NGO manager | `ngo@crisisloom.local` | `Ngo@12345` |
| Shelter staff | `shelter@crisisloom.local` | `Shelter@123` |
| Volunteer | `volunteer@crisisloom.local` | `Volunteer@123` |
| Donor | `donor@crisisloom.local` | `Donor@12345` |

## Full Docker stack

```bash
cd backend
copy .env.example .env
docker compose up --build
```

Compose maps:

- API `5000`
- MongoDB `27017`
- Redis `6379`

Set `MONGO_URI=mongodb://mongo:27017/crisisloom` and `REDIS_URL=redis://redis:6379` when the API runs inside Compose (already set in `docker-compose.yml`).

## Auth flow

1. `POST /api/v1/auth/register` or `POST /api/v1/auth/login`
2. Send `Authorization: Bearer <accessToken>`
3. Refresh with `POST /api/v1/auth/refresh` (cookie or body)
4. Roles: `admin`, `ngo_manager`, `shelter_staff`, `volunteer`, `donor`

Admin accounts are not self-registered. Create them with the seed script or directly in MongoDB.

## Critical need workflow

```text
Shelter creates a critical resource request
        ↓
Matching service finds volunteers with $near + 2dsphere
        ↓
BullMQ queues SMS, email, and in-app notifications
        ↓
Socket.IO broadcasts request:critical to the live dashboard
        ↓
Volunteer accepts assignment
        ↓
Request moves to in_progress / fulfilled
```

## Environment

Copy `.env.example`. SMTP and Twilio are optional: if they are empty, jobs are logged instead of delivered so local demos still work.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | TypeScript watch server |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run seed` | Insert demo Mumbai flood data |
| `npm run typecheck` | `tsc --noEmit` |

## Resume line

Designed and developed CrisisLoom, a real-time disaster relief coordination platform supporting geospatial volunteer matching, WebSocket live updates, Redis-backed job queues, role-based authentication, and automated SMS/email notifications.
