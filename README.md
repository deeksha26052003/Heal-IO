# Heal I/O

> *Input your health. Output your insights.*

A full-stack personal health tracker built for individuals living with chronic illnesses — PCOS, diabetes, fibromyalgia, lupus, and more. Heal I/O transforms daily health logs into visual trends and doctor-ready PDF reports.

---

## Table of Contents

- [Versions](#versions)
- [Project Objective](#project-objective)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Collections](#database-collections)
- [API Reference](#api-reference)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Authors](#authors)
- [License](#license)

---

## Versions

| Branch | Description |
|--------|-------------|
| `grading` | Original submission — frozen version for project grading |
| `main` | Updated version with usability improvements (see below) |

### Usability Updates (post-submission)

Based on usability study recordings, the following improvements were made to `main`:

- **Registration feedback** — After creating an account, users are now redirected to the login page with a clear success message ("Account created! Please sign in.") instead of silently landing on the login form
- **Registration validation** — Email must be a valid format (e.g. `user@domain.com`); password must be at least 8 characters and contain at least one letter and one number
- **Custom symptoms** — Users can now add their own symptoms in the Daily Log beyond the predefined list, using a text input and + button
- **Structured meal logging** — Meals now include a meal type (Breakfast / Lunch / Dinner / Snack), an optional time, and a food description instead of a plain text field
- **Health Report meals** — Meals in the report are now properly comma-separated and display type, time, and food clearly
- **Dashboard mood label** — The compact `m9` label in recent logs is now shown as `Mood 9` for clarity
- **CSS reorganized** — All CSS files moved into `src/css/components/` and `src/css/pages/` folders
- **Accessibility** — Slider inputs now have proper label association; gender selection buttons have `aria-pressed`; auth pages have a `<main>` landmark
- **SEO** — Added meta description and `robots.txt`

---

## Project Objective

Most chronic illness patients see their doctor for only 15 minutes. Heal I/O captures everything in between — giving patients and doctors a complete picture.

**Core capabilities:**
- Log daily symptoms, mood, energy, sleep, pain, meals, and cycle data
- Visualize trends and correlations (e.g. sleep quality vs. pain levels)
- Track medications and daily adherence with reminders
- Record doctor visits, prescriptions, and follow-up dates
- Generate and export doctor-ready health reports for any date range

---

## Features

### Health Logging & Analytics
- Daily check-ins: symptoms, mood (1–10), energy, sleep, pain, meals, cycle day & flow
- 28-day activity calendar with logged-day indicators
- 7-day bar charts for mood, energy, and pain trends
- Sleep vs. pain correlation analysis (poor / okay / good buckets)
- Top 5 most frequent symptoms
- Logging streak counter

### Health Reports
- Generate a printable report for any custom date range
- Includes all logged metrics, symptoms, and notes
- Export to PDF via browser print

### Medications & Adherence
- Add medications with name, dosage, frequency, reminder time, and notes
- Daily medication check-off with weekly adherence bar chart
- Toggle medications active/inactive (preserves history)
- Real-time reminder notifications via Socket.io

### Doctor Visits
- Log visits with doctor name, specialty, notes, and prescriptions
- Set and track follow-up appointment dates
- View, edit, and delete visit records

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express 4 |
| Database | MongoDB Atlas (native driver — no Mongoose) |
| Authentication | Passport.js (local strategy) + express-session |
| Session Storage | connect-mongo (MongoDB-backed sessions) |
| Real-time | Socket.io 4 (medication reminders) |
| Linting / Formatting | ESLint + Prettier |

> **Note:** This project deliberately does **not** use Axios (native `fetch` only), Mongoose, or the `cors` npm package (CORS headers are set manually).

---

## Project Structure

```
heal-io/
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Bar.jsx            # Animated bar chart
│   │   │   ├── Logo.jsx           # Brand logo
│   │   │   ├── Navbar.jsx         # Sidebar navigation
│   │   │   ├── SliderField.jsx    # Labeled range slider
│   │   │   └── WaveBackground.jsx # Animated canvas background
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state + fetch helpers
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Overview: streaks, recent stats
│   │   │   ├── DailyLog.jsx       # Daily health entry form
│   │   │   ├── Analytics.jsx      # Trends, charts, correlations
│   │   │   ├── Medications.jsx    # Medication list + adherence
│   │   │   ├── DoctorVisits.jsx   # Visit log & follow-ups
│   │   │   ├── HealthReport.jsx   # PDF-ready report view
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── App.jsx                # Router + protected route layout
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
│
├── server/                        # Express backend
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── dailylogs.controller.js
│   │   ├── medications.controller.js
│   │   └── doctorvisits.controller.js
│   ├── middleware/
│   │   ├── auth.js                # isAuthenticated guard
│   │   └── cors.js                # Manual CORS headers
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dailylogs.js
│   │   ├── medications.js
│   │   └── doctorvisits.js
│   ├── db.js                      # MongoDB connection
│   ├── passport.config.js         # Local auth strategy
│   ├── index.js                   # App entry point + Socket.io
│   ├── seed.js                    # Seeds 1000+ synthetic records
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── .prettierrc
├── LICENSE
└── README.md
```

---

## Database Collections

| Collection | CRUD | Key Fields |
|------------|------|------------|
| `users` | Create, Read | `name`, `email`, `password` (bcrypt), `gender`, `createdAt` |
| `daily_logs` | Full CRUD | `userId`, `date`, `mood`, `energy`, `sleep`, `pain`, `symptoms[]`, `meals`, `cycleDay`, `notes` |
| `medications` | Full CRUD | `userId`, `name`, `dosage`, `frequency`, `reminderTime`, `notes`, `active` |
| `adherence_logs` | Create, Read, Update | `userId`, `medId`, `date`, `taken` |
| `doctorvisits` | Full CRUD | `userId`, `doctorName`, `specialty`, `visitDate`, `notes`, `prescriptions[]`, `followUpDate` |

**Design notes:**
- One daily log per user per date (upsert pattern)
- One adherence entry per medication per date (upsert pattern)
- All collections scoped by `userId` — users can only access their own data

---

## API Reference

All endpoints require an active session except `POST /api/auth/register` and `POST /api/auth/login`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in and create a session |
| `POST` | `/api/auth/logout` | Destroy the current session |
| `GET` | `/api/auth/me` | Return the current user |

### Daily Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dailylogs` | Fetch all logs (supports `?from=YYYY-MM-DD&to=YYYY-MM-DD`) |
| `GET` | `/api/dailylogs/:date` | Fetch log for a specific date |
| `POST` | `/api/dailylogs` | Create or update a log (upsert by date) |
| `DELETE` | `/api/dailylogs/:id` | Delete a log entry |

### Medications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/medications` | List all medications |
| `POST` | `/api/medications` | Add a new medication |
| `PUT` | `/api/medications/:id` | Update medication details |
| `PATCH` | `/api/medications/:id/toggle` | Toggle active/inactive status |
| `POST` | `/api/medications/adherence` | Log a daily adherence check-off |
| `GET` | `/api/medications/adherence` | Get adherence logs (supports date range) |

### Doctor Visits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/visits` | List all visits (sorted newest first) |
| `POST` | `/api/visits` | Create a new visit record |
| `PUT` | `/api/visits/:id` | Update a visit record |
| `DELETE` | `/api/visits/:id` | Delete a visit record |

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier is sufficient)

### 1. Clone the repository

```bash
git clone https://github.com/deeksha26052003/heal-io.git
cd heal-io
```

### 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your values — see [Environment Variables](#environment-variables) below.

### 3. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 4. Seed the database (optional but recommended)

```bash
cd server && npm run seed
# Inserts 1000+ synthetic health records for testing
```

### 5. Start the development servers

Open two terminals:

```bash
# Terminal 1 — backend (http://localhost:5001)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

### 6. Open the app

Visit [http://localhost:5173](http://localhost:5173)

**Demo credentials (seeded):**
- Email: `sara@example.com`
- Password: `HealIO2024!`

---

## Link to youtube demo video : 

https://youtu.be/m1jSB1HtMEA

## Environment Variables

Create `server/.env` based on `server/.env.example`:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Express server port | `5001` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/healio` |
| `SESSION_SECRET` | Secret key for session encryption | Any long random string |
| `CLIENT_URL` | Frontend origin (used for CORS + Socket.io) | `http://localhost:5173` |

---

## Available Scripts

### Server (`/server`)

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node index.js` | Start in production mode |
| `dev` | `nodemon index.js` | Start with auto-reload (development) |
| `seed` | `node seed.js` | Populate database with test data |
| `lint` | `eslint . --ext .js` | Run ESLint |
| `format` | `prettier --write .` | Auto-format all files |

### Client (`/client`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `vite build` | Build for production |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint src --ext .jsx,.js` | Run ESLint |
| `format` | `prettier --write src` | Auto-format source files |

---

## Deployment

Live app: **https://heal-io.onrender.com**

| Service | Provider |
|---------|----------|
| Backend | Render (Node.js) |
| Frontend | Render / Vercel |
| Database | MongoDB Atlas |

---

## Screenshots

<img width="2980" height="1738" alt="image" src="https://github.com/user-attachments/assets/13c8fed7-bcdd-4f66-ab7b-108896fea4ee" />
<img width="2980" height="1738" alt="image" src="https://github.com/user-attachments/assets/b77bd95c-8070-455c-ab44-83b6a89f557a" />
<img width="2980" height="1738" alt="image" src="https://github.com/user-attachments/assets/399853a9-88c0-481e-8083-52abfc4c86b1" />
<img width="2980" height="1738" alt="image" src="https://github.com/user-attachments/assets/f8fda5ff-96da-42e6-845d-829b03cf28ab" />





## Authors

| Name | GitHub | Contributions |
|------|--------|--------------|
| Shriya Yarrapureddy Sarath | [@shriyays](https://github.com/shriyays) | Health Logging, Analytics, Reports |
| Deeksha Manjunatha Bankapur | [@deeksha26052003](https://github.com/deeksha26052003) | Medications, Doctor Visits, Adherence |

**CS5610 — Web Development**
Northeastern University, Khoury College of Computer Sciences
[Course Link](https://johnguerra.co/classes/webDevelopment_fall_2024/)

---

## License

[MIT](LICENSE) © 2025 Shriya Yarrapureddy Sarath & Deeksha Manjunatha Bankapur
