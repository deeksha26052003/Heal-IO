# Heal I/O — Design Document

> *Input your health. Output your insights.*

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Frontend Design](#3-frontend-design)
4. [Backend Design](#4-backend-design)
5. [Database Design](#5-database-design)
6. [Authentication & Session Management](#6-authentication--session-management)
7. [API Design](#7-api-design)
8. [Real-Time Layer](#8-real-time-layer)
9. [Health Report & PDF Export](#9-health-report--pdf-export)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Design Decisions & Trade-offs](#11-design-decisions--trade-offs)
12. [Security Considerations](#12-security-considerations)

---

## 1. Overview

Heal I/O is a full-stack personal health tracker designed for individuals managing chronic illnesses such as PCOS, diabetes, fibromyalgia, and lupus. The application bridges the gap between routine doctor appointments by giving patients a structured way to log, visualize, and communicate their health data.

### Goals

| Goal | Implementation |
|------|----------------|
| Capture daily health data | Structured logging form with sliders, symptom selectors, and cycle tracking |
| Surface trends and correlations | Aggregated analytics with sleep-vs-pain correlation analysis |
| Support medication adherence | Daily check-off system with weekly adherence charts |
| Enable doctor communication | PDF-ready health reports for any date range |
| Ensure data privacy | Session-based authentication; all data scoped by `userId` |

### Non-Goals

- Multi-user sharing or caregiver access
- Clinical diagnosis or medical advice
- Native mobile app (web-responsive only)
- Offline-first / PWA support (future consideration)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │           React 18 + Vite  (Port 5173)                   │  │
│   │                                                          │  │
│   │   AuthContext ──► Pages ──► Components                   │  │
│   │       │                         │                        │  │
│   │   session cookie           fetch() + socket.io-client    │  │
│   └───────────────────┬─────────────────────────────────────┘  │
└───────────────────────│──────────────────────────────────────── ┘
                        │  HTTP + WebSocket (proxied via Vite)
┌───────────────────────▼─────────────────────────────────────────┐
│                    EXPRESS SERVER  (Port 5001)                   │
│                                                                  │
│   ┌─────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│   │  CORS       │  │  express-     │  │  Passport.js       │   │
│   │  Middleware │  │  session      │  │  LocalStrategy     │   │
│   └──────┬──────┘  └───────┬───────┘  └─────────┬──────────┘   │
│          └────────────────┬┘                    │               │
│                           ▼                     ▼               │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                     Route Handlers                        │  │
│   │  /api/auth  /api/dailylogs  /api/medications  /api/visits │  │
│   └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│   ┌──────────────────────────▼───────────────────────────────┐  │
│   │                     Controllers                           │  │
│   │  auth  │  dailylogs  │  medications  │  doctorvisits     │  │
│   └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│   ┌──────────────────────────▼───────────────────────────────┐  │
│   │             MongoDB Native Driver  (db.js)                │  │
│   └──────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────│──────────────────────────────────┘
                               │  mongodb+srv://
┌──────────────────────────────▼──────────────────────────────────┐
│                       MongoDB Atlas                              │
│                                                                  │
│   users │ daily_logs │ medications │ adherence_logs │ visits     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

- **Separation of concerns** — frontend and backend are independent processes communicating via a REST API
- **No ORM** — raw MongoDB native driver for full query control and transparency
- **Session-based auth** — server-side sessions stored in MongoDB via `connect-mongo`
- **No external CORS library** — CORS headers are set manually in a single middleware file
- **Native fetch only** — no Axios; all HTTP calls use the browser `fetch()` API with `credentials: 'include'`

---

## 3. Frontend Design

### Component Hierarchy

```
App.jsx  (Router)
├── /login          → Login.jsx
├── /register       → Register.jsx
└── ProtectedRoute  (redirects to /login if unauthenticated)
    └── Layout
        ├── Navbar.jsx           (sidebar: logo, nav links, user info, logout)
        ├── WaveBackground.jsx   (animated canvas, login/register only)
        └── Pages
            ├── /dashboard       → Dashboard.jsx
            ├── /log             → DailyLog.jsx
            ├── /analytics       → Analytics.jsx
            ├── /medications     → Medications.jsx
            ├── /visits          → DoctorVisits.jsx
            └── /report          → HealthReport.jsx
```

### Shared Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `Navbar.jsx` | Sidebar navigation, user avatar, logout | — (reads from AuthContext) |
| `Bar.jsx` | Animated horizontal bar chart | `value`, `max`, `color`, `label` |
| `SliderField.jsx` | Labeled range slider (0–10) | `label`, `value`, `onChange`, `color` |
| `Logo.jsx` | Brand mark, used in navbar and reports | `size` |
| `WaveBackground.jsx` | Canvas wave animation | — |

### Global State — AuthContext

`AuthContext.jsx` is the single source of truth for authentication state. It wraps the entire app and exposes:

```
AuthContext {
  user: { _id, name, email, gender } | null
  loading: boolean
  login(email, password)  → Promise
  register(name, email, password, gender)  → Promise
  logout()  → Promise
}
```

On mount, the context calls `GET /api/auth/me` to restore any existing session, making page refreshes seamless. All pages that need the current user consume this context via `useContext(AuthContext)`.

### Page Responsibilities

#### Dashboard
The entry-point page after login. Aggregates data from multiple sources to give an at-a-glance health overview:
- Today's metrics (mood, energy, sleep, pain) pulled from `GET /api/dailylogs/:date`
- 7-day bar chart from the last 7 log entries
- 28-day activity calendar (green dot = logged, grey = missed)
- Logging streak computed by checking consecutive logged days backwards from today
- Top 3 symptoms from the last 28 days
- Today's medications and adherence %

#### DailyLog
The primary data entry page. Key UX decisions:
- Sliders for subjective metrics (mood 0–10, energy 0–10, pain 0–10) so entry feels quick and intuitive
- Symptom selector uses a tag-toggle model (10 predefined options)
- Cycle tracking section (cycle day number + flow intensity) kept optional
- Form pre-populates if a log already exists for the selected date (supports editing past entries)
- Single `POST /api/dailylogs` handles both create and update (upsert)

#### Analytics
Supports 3 time ranges (7d / 30d / 90d). Aggregation is performed entirely on the frontend from raw log data returned by `GET /api/dailylogs?from=&to=`:

- **Averages** — mean of each metric over the selected window
- **7-day trend chart** — last 7 logs regardless of selected range
- **Sleep-vs-pain correlation** — groups logs by sleep buckets:
  - Poor: `sleep < 6h`
  - Okay: `6h ≤ sleep < 7h`
  - Good: `sleep ≥ 7h`
  - Reports average pain per bucket to surface the correlation
- **Symptom frequency** — counts per symptom, sorted descending, top 5 shown

#### Medications
Manages both medication metadata and daily adherence:
- Add/edit medications (name, dosage, frequency, reminder time, notes)
- Toggle active/inactive (soft delete — history preserved)
- One adherence check-off per medication per day
- Weekly adherence bar chart (7 days × medications)

#### Doctor Visits
Chronological list of medical appointments with:
- Prescriptions stored as an array (parsed from comma-separated input)
- Follow-up date tracking with visual badge when upcoming
- Full edit and delete support

#### Health Report
Generates a structured, print-optimized document from any date range:
1. Fetches logs, medications, adherence logs, and visits in parallel
2. Renders a multi-section report in the DOM
3. `window.print()` with `@media print` CSS produces a clean PDF

---

## 4. Backend Design

### Directory Structure

```
server/
├── index.js              # App entry point: Express, Socket.io, session, Passport
├── db.js                 # MongoDB connection module (getDB / connectDB)
├── passport.config.js    # LocalStrategy: email + bcrypt
├── seed.js               # Generates 1000+ synthetic records for testing
├── controllers/
│   ├── auth.controller.js
│   ├── dailylogs.controller.js
│   ├── medications.controller.js
│   └── doctorvisits.controller.js
├── routes/
│   ├── auth.js
│   ├── dailylogs.js
│   ├── medications.js
│   └── doctorvisits.js
└── middleware/
    ├── auth.js            # isAuthenticated guard
    └── cors.js            # Manual CORS headers
```

### Request Lifecycle

```
Request
  │
  ▼
cors.js middleware          ← Sets CORS headers, handles OPTIONS preflight
  │
  ▼
express-session             ← Attaches session to req
  │
  ▼
passport.initialize()       ← Deserializes user from session into req.user
  │
  ▼
Route Handler               ← Matches path and HTTP method
  │
  ▼
isAuthenticated (if protected)  ← Returns 401 if req.isAuthenticated() is false
  │
  ▼
Controller function         ← Business logic + MongoDB operations
  │
  ▼
Response (JSON)
```

### Controller Patterns

All controllers follow the same pattern:

```javascript
async function controllerName(req, res) {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    // ... MongoDB operation ...
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
```

#### Upsert Pattern (Daily Logs & Adherence)

To enforce "one log per user per date", both `daily_logs` and `adherence_logs` use `findOneAndUpdate` with `upsert: true`:

```javascript
await db.collection('daily_logs').findOneAndUpdate(
  { userId, date },           // filter: find by user + date
  { $set: { ...fields } },    // update: overwrite fields
  { upsert: true, returnDocument: 'after' }
);
```

This makes `POST /api/dailylogs` idempotent — calling it twice with the same date safely updates the existing record.

---

## 5. Database Design

### Collections

#### `users`
```
{
  _id:        ObjectId   (auto-generated)
  name:       String     required
  email:      String     required, unique
  password:   String     bcrypt hash, 12 rounds
  gender:     String     "male" | "female"
  createdAt:  Date
}
```

#### `daily_logs`
```
{
  _id:        ObjectId
  userId:     ObjectId   (ref: users._id)
  date:       String     "YYYY-MM-DD"  ← string for simple equality queries
  mood:       Number     0–10
  energy:     Number     0–10
  sleep:      Number     0–12 (hours)
  pain:       Number     0–10
  symptoms:   String[]   e.g. ["Fatigue", "Headache"]
  meals:      String[]   free-text meal entries
  cycleDay:   Number     optional
  notes:      String     optional
  createdAt:  Date
  updatedAt:  Date
}
Unique index: { userId, date }
```

#### `medications`
```
{
  _id:          ObjectId
  userId:       ObjectId
  name:         String
  dosage:       String   e.g. "500mg"
  frequency:    String   "Daily" | "Twice daily" | "Weekly" | "As needed"
  reminderTime: String   "HH:MM" format
  notes:        String   optional
  active:       Boolean  default true
  createdAt:    Date
  updatedAt:    Date
}
```

#### `adherence_logs`
```
{
  _id:       ObjectId
  userId:    ObjectId
  medId:     ObjectId   (ref: medications._id)
  date:      String     "YYYY-MM-DD"
  taken:     Boolean
  createdAt: Date
  updatedAt: Date
}
Unique index: { userId, medId, date }
```

#### `doctor_visits`
```
{
  _id:          ObjectId
  userId:       ObjectId
  doctorName:   String
  specialty:    String   optional
  visitDate:    String   "YYYY-MM-DD"
  notes:        String   optional
  prescriptions: String[]
  followUpDate: String   "YYYY-MM-DD", optional
  createdAt:    Date
}
```

### Data Scoping

Every collection document carries a `userId` field. All queries include `{ userId: new ObjectId(req.user._id) }` as a mandatory filter — users can never access another user's data, even if they know the `_id` of a record.

### Design: String Dates vs. Date Objects

Dates are stored as `"YYYY-MM-DD"` strings rather than `Date` objects. This:
- Enables direct equality queries (`find({ date: "2024-11-01" })`) without timezone conversion
- Matches the format returned by `<input type="date">` in browsers
- Avoids UTC offset bugs where `new Date("2024-11-01")` converts to the previous day in negative-offset timezones

---

## 6. Authentication & Session Management

### Flow

```
┌──────────────┐   POST /api/auth/login      ┌────────────────────┐
│   Browser    │ ─────────────────────────►  │  Passport Local    │
│              │   { email, password }        │  Strategy          │
│              │                             │  bcrypt.compare()  │
│              │  ◄──────────────────────────│                    │
│              │   Set-Cookie: connect.sid   └────────────────────┘
│              │                                      │
│              │                               stores session in
│              │                               MongoDB (connect-mongo)
│              │
│              │   GET /api/auth/me           ┌────────────────────┐
│              │ ─────────────────────────►  │  isAuthenticated() │
│              │   Cookie: connect.sid        │  Passport deserial │
│              │                             │  → req.user        │
│              │  ◄──────────────────────────│                    │
│              │   { _id, name, email }      └────────────────────┘
└──────────────┘
```

### Session Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| `store` | MongoStore | Persists sessions across server restarts |
| `secret` | `SESSION_SECRET` env var | Signs the session cookie |
| `resave` | `false` | Avoids unnecessary session writes |
| `saveUninitialized` | `false` | No session created until login |
| `cookie.maxAge` | 7 days | Balances security and UX convenience |
| `cookie.httpOnly` | `true` | Prevents JavaScript access to cookie |

### Password Security

Passwords are hashed with `bcrypt` at **12 salt rounds** before storage. The plaintext password is never stored or logged. On login, `bcrypt.compare()` verifies the input against the stored hash in constant time, preventing timing attacks.

---

## 7. API Design

### Conventions

- All endpoints are prefixed with `/api/`
- All responses are `application/json`
- Protected endpoints return `401 Unauthorized` if no valid session exists
- All `ObjectId` values are validated by MongoDB; invalid IDs produce a 500 error (could be improved to 400)
- Date range filtering uses `?from=YYYY-MM-DD&to=YYYY-MM-DD` query parameters

### Endpoint Summary

#### Auth — `/api/auth`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/register` | Public | `{ name, email, password, gender }` | `201 { userId }` |
| `POST` | `/login` | Public | `{ email, password }` | `200 { message, user }` |
| `POST` | `/logout` | Required | — | `200 { message }` |
| `GET` | `/me` | Required | — | `200 { _id, name, email, gender }` |

#### Daily Logs — `/api/dailylogs`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/` | Required | Supports `?from=&to=` filters; sorted newest first |
| `GET` | `/:date` | Required | `date` is `YYYY-MM-DD`; returns 404 if no log |
| `POST` | `/` | Required | Upserts by `userId + date`; returns saved document |
| `DELETE` | `/:id` | Required | `id` is MongoDB ObjectId |

#### Medications — `/api/medications`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/` | Required | All meds for user, sorted by `createdAt` desc |
| `POST` | `/` | Required | Creates med with `active: true` |
| `PUT` | `/:id` | Required | Updates fields; cannot change `_id` or `userId` |
| `PATCH` | `/:id/toggle` | Required | Flips `active` boolean |
| `POST` | `/adherence` | Required | Upserts `{ medId, date, taken }` |
| `GET` | `/adherence` | Required | Supports `?from=&to=` filters |

#### Doctor Visits — `/api/visits`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/` | Required | Sorted by `visitDate` desc |
| `POST` | `/` | Required | Creates visit; `prescriptions` stored as array |
| `PUT` | `/:id` | Required | Full update |
| `DELETE` | `/:id` | Required | Hard delete |

### Health Check

`GET /api/health` — returns `{ status: 'ok' }`, no auth required. Used by deployment platforms to verify the server is running.

---

## 8. Real-Time Layer

Socket.io is initialized on the same HTTP server as Express. The architecture supports medication reminders via WebSocket rooms:

```
Client connects → socket.emit('join', userId)
             → server: socket.join(`user_${userId}`)

Server (future): io.to(`user_${userId}`).emit('reminder', { medication })
```

**Current state:** The Socket.io infrastructure (server init, room management, client connection) is fully in place. Reminder delivery logic is scaffolded for future implementation. The `reminderTime` field stored on each medication record (in `HH:MM` format) is intended to trigger these push notifications.

**Planned implementation:** A scheduled job (e.g., `node-cron`) would run every minute, compare the current time to each active medication's `reminderTime`, and emit a reminder to the relevant user's room.

---

## 9. Health Report & PDF Export

The health report is a client-side rendered document that uses the browser's native print functionality to produce a PDF — no server-side PDF generation library is required.

### Generation Pipeline

```
User selects date range
         │
         ▼
Parallel fetch (Promise.all):
  GET /api/dailylogs?from=&to=
  GET /api/medications
  GET /api/visits
  GET /api/medications/adherence?from=&to=
         │
         ▼
React renders report sections in DOM
         │
         ▼
User clicks "Download PDF"
         │
         ▼
window.print()
         │
         ▼
Browser print dialog → Save as PDF
```

### Report Sections

1. **Cover** — logo, patient name, date range, total entries, summary metrics
2. **Weekly Trends Table** — per-week averages for mood, energy, sleep, pain
3. **Symptom Frequency** — horizontal bars showing top symptoms and their occurrence rates
4. **Sleep vs. Pain Correlation** — clinical-style analysis bucketed by sleep quality
5. **Medications** — active and inactive meds with dosage and frequency
6. **Adherence Table** — per-medication adherence rates for the period
7. **Doctor Visits** — visits within date range with notes and prescriptions
8. **Full Log Table** — day-by-day record of all metrics

### Print CSS Strategy

```css
@media print {
  .navbar, .report-controls { display: none; }
  * { -webkit-print-color-adjust: exact; }
  .report-section { page-break-inside: avoid; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
```

---

## 10. Data Flow Diagrams

### Daily Log Entry

```
User opens /log
      │
      ▼
GET /api/dailylogs/:today   ──► if found: pre-populate form fields
      │                         if 404: show empty form
      │
User fills out form
      │
      ▼
POST /api/dailylogs
  { date, mood, energy, sleep, pain, symptoms, meals, cycleDay, notes }
      │
      ▼
Controller: findOneAndUpdate({ userId, date }, $set, { upsert: true })
      │
      ▼
Returns saved document → frontend confirms save
```

### Analytics Aggregation

```
User selects time range (7d / 30d / 90d)
      │
      ▼
GET /api/dailylogs?from=&to=   ──► Array of log documents
      │
      ▼
Frontend computes:
  avg(mood)  avg(energy)  avg(sleep)  avg(pain)
  symptom frequency map (reduce → sort → top 5)
  sleep buckets → pain average per bucket
      │
      ▼
Render charts and metric cards
```

### Medication Adherence Check-off

```
User views /medications
      │
      ▼
GET /api/medications           ──► all user medications
GET /api/medications/adherence
  ?from=today&to=today         ──► today's taken status per med
      │
      ▼
User clicks "Mark taken" for a medication
      │
      ▼
POST /api/medications/adherence
  { medId, date: today, taken: true }
      │
      ▼
Controller: findOneAndUpdate({ userId, medId, date }, $set, { upsert: true })
      │
      ▼
UI updates taken status + recalculates adherence %
```

---

## 11. Design Decisions & Trade-offs

### Native MongoDB Driver vs. Mongoose

**Decision:** Use MongoDB's native driver (`mongodb` npm package) directly.

**Rationale:**
- Full control over queries — no schema validation layer or hidden overhead
- Forces explicit `ObjectId` conversions, making data types visible
- Simpler dependency tree; no risk of Mongoose version conflicts

**Trade-off:** More boilerplate per query; no automatic schema validation. Input validation is the controller's responsibility, which is currently minimal (should be hardened before production).

---

### String Dates vs. BSON Dates

**Decision:** Store dates as `"YYYY-MM-DD"` strings.

**Rationale:**
- Browser `<input type="date">` returns strings in this format
- Equality queries are trivial: `{ date: "2024-11-01" }`
- Avoids timezone offset bugs common with JavaScript `Date` objects and MongoDB UTC storage

**Trade-off:** Range queries require string comparison (which works correctly for ISO dates but is less explicit than `$gte` on Date objects).

---

### Frontend Aggregation vs. Backend Aggregation

**Decision:** All analytics calculations happen on the frontend from raw log arrays.

**Rationale:**
- Simpler backend — controllers are thin CRUD layers
- Flexible — UI can re-aggregate without additional API calls
- Log records are small; fetching 90 days (~90 documents) is negligible

**Trade-off:** At large scale (multi-year data), fetching all logs becomes expensive. For production, aggregation pipelines on the backend with indexed queries would be preferable.

---

### Print-to-PDF vs. PDF Library

**Decision:** Use `window.print()` with print CSS instead of a library like `pdfmake` or `puppeteer`.

**Rationale:**
- Zero dependencies
- The browser renders the document exactly as the user sees it (fonts, layout, colors)
- Users can choose page size, orientation, and margins in the print dialog

**Trade-off:** No programmatic control over output file name, no server-side generation, and layout fidelity depends on the browser's PDF engine.

---

### No `cors` npm Package

**Decision:** Manually set CORS headers in `server/middleware/cors.js`.

**Rationale:**
- Explicit and transparent — behavior is clear from reading the file
- No dependency on a package that abstracts away a security-critical header

**Trade-off:** Must be manually updated if the list of allowed methods or headers changes.

---

## 12. Security Considerations

### Implemented

| Concern | Mitigation |
|---------|-----------|
| Password storage | `bcrypt` with 12 salt rounds |
| Session fixation | `express-session` regenerates session ID on login |
| CSRF | Mitigated by `SameSite` cookie behavior; session-based auth |
| Data isolation | All queries filtered by `userId` from the server-side session |
| Cookie security | `httpOnly: true` prevents XSS cookie theft |
| CORS | Explicit origin allowlist via `CLIENT_URL` env var |

### Areas for Hardening (Future Work)

| Concern | Recommendation |
|---------|---------------|
| Input validation | Add `joi` or `zod` validation in controllers; currently minimal server-side validation |
| Rate limiting | Add `express-rate-limit` to auth endpoints to prevent brute-force |
| ObjectId validation | Validate `req.params.id` is a valid ObjectId before querying; currently a malformed ID causes a 500 |
| HTTPS enforcement | Ensure `cookie.secure: true` in production (requires HTTPS) |
| Session cookie `SameSite` | Explicitly set `sameSite: 'lax'` or `'strict'` in production |
| Error messages | Avoid leaking implementation details in 500 error responses |

---

*Last updated: March 2026*
*Authors: Shriya Yarrapureddy Sarath & Deeksha Manjunatha Bankapur*
*CS5610 Web Development — Northeastern University*
