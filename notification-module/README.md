# APCOER - Leave Management Notification System

A production-grade, full-stack **Faculty Leave Management Notification Module** engineered using an MVC backend architecture and a highly polished glassmorphic React.js SPA frontend.

---

## Technical Architecture Overview

### MVC Backend (Node.js + Express + Sequelize ORM)
* **Zero-Install Database Setup**: Configured with SQLite as the default database for instant offline evaluation (fully swappable to PostgreSQL or MySQL inside `.env`).
* **JWT Identity Security**: Passwords are securely hashed using `bcryptjs` and routes are locked behind cryptographic JSON Web Tokens.
* **SMTP Email Notification Engine**: Reusable Nodemailer engine featuring:
  * Sleek HSL styled HTML email templates.
  * Live delivery tracking tables logged inside the database.
  * Robust **Exponential Backoff Retry Scheduler** (up to 3 automatic attempts).
  * Safe mock SMTP transport fallback (logs compile output to terminal when credentials are blank).

### React SPA Frontend (React + Vite + Vanilla CSS)
* **HSL Color Aesthetics**: Gorgeous, responsive glassmorphic cards and dashboards tailored uniquely across all five organizational roles (Faculty, HOD, Principal, Clerk, and Admin).
* **Dynamic Reports Compiler**: Integrated client-side `jspdf` and `jspdf-autotable` builders to download granular leave registry summaries on the fly directly inside the browser.
* **Identity Management Controls**: Full CRUD dashboard to register profiles, edit privilege roles, and review security settings.

---

## Credential Directory (Default Password: `password123`)

| Profile Role | Default Email Address | Primary Operations |
| :--- | :--- | :--- |
| **FACULTY** | `faculty@apcoer.edu.in` | File leaves, inspect dynamic status indicators. |
| **HOD** | `hod@apcoer.edu.in` | Review and action department pending requests. |
| **PRINCIPAL** | `principal@apcoer.edu.in` | Monitor global queues, check approver remarks. |
| **CLERK** | `clerk@apcoer.edu.in` | Generate analytical reports, download print PDFs. |
| **ADMIN** | `admin@apcoer.edu.in` | Create user identities, adjust privilege scopes. |

---

## Quick-Start Run Guide

### 1. Backend Core Server Setup
Open a terminal in `backend/` directory:
```bash
# 1. Fetch dependencies
npm install

# 2. Setup SQLite tables and seed demo accounts
npm run seed

# 3. Ignite server
npm start
```
* The backend server fires up on: [http://localhost:5000](http://localhost:5000)

### 2. Frontend React Dashboard Setup
Open a second terminal in `frontend/` directory:
```bash
# 1. Fetch dependencies
npm install

# 2. Launch Vite dev compiler
npm run dev
```
* The React client mounts on: [http://localhost:3000](http://localhost:3000)
