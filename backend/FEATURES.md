# CrisisLoom Features

Complete backend feature map for **CrisisLoom**. All 11 modules live in the layered folders: `models`, `controllers`, `routes`, `validators`, `services`, plus `config`, `middleware`, `sockets`, `queues`, `workers`, and `docs`.

Base URL: `/api/v1`

---

## Module 1 — Foundation and infrastructure

- TypeScript Express app split into `app.ts` and `server.ts`
- Zod-validated environment config
- MongoDB connection with Mongoose 8 (interfaces do **not** extend `Document`)
- Redis connection for cache and BullMQ
- Winston file + console logging
- Request IDs (`X-Request-Id`)
- Helmet, CORS, compression, cookie parser
- Global and auth rate limits
- Central `ApiError` / `ApiResponse` contract
- Health probes: `GET /health`, `GET /health/ready`
- Docker multi-stage build and Compose (API + MongoDB + Redis)

---

## Module 2 — Authentication and RBAC

Roles: `admin`, `ngo_manager`, `shelter_staff`, `volunteer`, `donor`

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public (cannot self-register as admin) |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh token cookie or body |
| POST | `/auth/logout` | Authenticated |
| GET | `/auth/me` | Authenticated |
| PATCH | `/auth/change-password` | Authenticated |
| POST | `/auth/forgot-password` | Public, queues OTP email |
| POST | `/auth/reset-password` | Public |

Implementation details:

- Access JWT (~15m) + refresh JWT (~7d)
- Refresh tokens hashed at rest on the user document
- Password hashing with bcrypt
- Auth limiter on login/register/reset

---

## Module 3 — User management

| Method | Path | Access |
| --- | --- | --- |
| GET | `/users` | Admin, NGO manager |
| GET | `/users/:id` | Authenticated |
| PATCH | `/users/:id` | Self or admin |
| PATCH | `/users/:id/role` | Admin |
| PATCH | `/users/:id/status` | Admin |
| DELETE | `/users/:id` | Admin |

Supports pagination, search, and role filters.

---

## Module 4 — Shelter management (geospatial)

GeoJSON `Point` stored as `[longitude, latitude]` with a `2dsphere` index.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/shelters` | Admin, NGO, shelter staff |
| GET | `/shelters` | Public list + filters |
| GET | `/shelters/nearby?lng=&lat=&radius=` | Public `$near` query |
| GET | `/shelters/:id` | Public, Redis cached |
| PATCH | `/shelters/:id` | Staff / NGO / admin |
| PATCH | `/shelters/:id/occupancy` | Live bed counts, Socket.IO broadcast |
| DELETE | `/shelters/:id` | Admin, NGO |

`availableBeds` is derived as `capacity - occupied`. Occupied cannot exceed capacity.

---

## Module 5 — Volunteer management (geospatial)

| Method | Path | Access |
| --- | --- | --- |
| POST | `/volunteers` | Volunteer upsert profile |
| GET | `/volunteers` | Admin / NGO / shelter staff |
| GET | `/volunteers/nearby` | `$near` available volunteers |
| GET | `/volunteers/me` | Volunteer |
| PATCH | `/volunteers/me` | Volunteer |
| PATCH | `/volunteers/me/location` | Live location + socket event |
| PATCH | `/volunteers/me/availability` | `available` / `busy` / `offline` |
| GET | `/volunteers/:id` | Authenticated |

---

## Module 6 — Donor management

| Method | Path | Access |
| --- | --- | --- |
| POST | `/donors` | Donor profile |
| GET | `/donors` | Admin, NGO |
| GET | `/donors/nearby` | Geospatial donors |
| GET | `/donors/me` | Donor |
| PATCH | `/donors/me` | Donor |
| GET | `/donors/:id` | Authenticated |

Donor types: `individual`, `organization`.

---

## Module 7 — Disaster zones

| Method | Path | Access |
| --- | --- | --- |
| POST | `/disasters` | Admin, NGO |
| GET | `/disasters` | Public list |
| GET | `/disasters/active` | Redis-cached active/contained zones |
| GET | `/disasters/:id` | Public |
| PATCH | `/disasters/:id` | Admin, NGO |
| GET | `/disasters/:id/nearby-assets` | Shelters + volunteers inside radius |

Types include flood, earthquake, cyclone, fire, pandemic, drought, landslide, tsunami.

---

## Module 8 — Resource inventory and requests

Inventory is per shelter and unique on `(shelter, resourceType)`.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/resources/shelter/:shelterId` | Upsert stock |
| GET | `/resources/shelter/:shelterId` | List stock |
| PATCH | `/resources/:id` | Update quantity/threshold |
| GET | `/resources/low-stock` | Below `minThreshold` |
| POST | `/requests` | Create need (critical auto-dispatches) |
| GET | `/requests` | Filter by status, priority, shelter, disaster |
| GET | `/requests/:id` | Detail |
| PATCH | `/requests/:id` | Update |
| POST | `/requests/:id/cancel` | Cancel |
| POST | `/requests/:id/fulfill` | Fulfill and increment inventory |

Low stock triggers admin email + in-app notification jobs.

---

## Module 9 — Assignments and geospatial matching

Critical request flow uses MongoDB `$near`:

```js
location: {
  $near: {
    $geometry: { type: "Point", coordinates: [lng, lat] },
    $maxDistance: 10000
  }
}
```

| Method | Path | Access |
| --- | --- | --- |
| POST | `/assignments` | Admin/NGO manual assign |
| GET | `/assignments` | Authenticated (volunteers see own) |
| POST | `/assignments/:id/accept` | Volunteer / donor |
| POST | `/assignments/:id/reject` | Volunteer / donor |
| POST | `/assignments/:id/complete` | Volunteer / donor / staff |

Accepting a task marks the volunteer `busy`. Completing it increments `completedMissions`.

---

## Module 10 — Notifications, email, SMS, queues

BullMQ queues (Redis):

- `email-queue`
- `sms-queue`
- `notification-queue`

Workers retry with exponential backoff. Missing SMTP/Twilio credentials fail open to structured logs so local development still runs.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/notifications` | Current user |
| PATCH | `/notifications/:id/read` | Current user |
| PATCH | `/notifications/read-all` | Current user |

Password reset OTPs are also queued through the email worker.

---

## Module 11 — Real-time, dashboard, observability, docs

Socket.IO rooms: `dashboard`, `user:{id}`, `role:{role}`, `shelter:{id}`, `disaster:{id}`

Events:

- `shelter:updated`
- `request:created`
- `request:critical`
- `request:updated`
- `assignment:updated`
- `volunteer:location`
- `disaster:updated`
- `notification:new`

| Method | Path | Access |
| --- | --- | --- |
| GET | `/dashboard/stats` | Cached counts (15s Redis TTL) |
| GET | `/dashboard/activity` | Activity log trail |

Also included:

- Swagger UI at `/api/docs`
- Activity logging on sensitive mutations
- Docker production image
- Seed dataset around Mumbai (`72.8777, 19.0760`)

---

## Collections

`users`, `volunteers`, `donors`, `shelters`, `disasters`, `resources`, `resourcerequests`, `assignments`, `notifications`, `activitylogs`

---

## Security notes

- Refresh tokens are hashed before storage
- Admin role cannot be claimed via public register
- Validation on every write path
- Duplicate key and Mongoose validation errors mapped to HTTP 409/400
- Rate limits on auth and global traffic
- Secrets stay in `.env` (never commit real Twilio/SMTP keys)
