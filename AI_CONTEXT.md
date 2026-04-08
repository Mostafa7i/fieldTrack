# FieldTrack - AI Context & Knowledge Base

This file serves as a unified context document for Artificial Intelligence assistants working on the **FieldTrack** project. It summarizes the tech stack, the architecture, the user roles, and the progress made so far.

---

## 1. Project Overview
**FieldTrack** is an internship and field training management system connecting four key entities:
- **Students**: Apply to internships, submit weekly training reports, and view evaluations.
- **Companies**: Post internships, review student applications, and submit final evaluations for the students training with them.
- **Supervisors (Academic)**: Review and grade the weekly training reports submitted by the students assigned to them.
- **Admins**: Manage the entire system, manage users, verify companies, and assign students to their respective academic supervisors.

## 2. Tech Stack
- **Frontend**: Next.js (App Router), React, React context (`AuthContext`), scoped CSS modules / standard CSS, `recharts` for analytics, and `axios` for API requests. Running on port `3000`.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JSON Web Tokens (JWT) for authentication. Running on port `5000`.

## 3. Database Models Reference
- `User`: Base schema for authentication (`name`, `email`, `password`, `role`, `isActive`).
- `Student`: Linked to `User`. Contains `university`, `gpa`, `skills`, and importantly a `supervisor` reference (ObjectId pointing to a Supervisor `User`).
- `Company`: Linked to `User`. Contains `companyName`, `industry`, `isVerified`.
- `Internship`: Job postings created by a `Company`.
- `Application`: Tracks a student's application to an internship (`pending`, `accepted`, `rejected`, etc.).
- `TrainingReport`: Weekly logs submitted by students. Evaluated by Supervisors (`status`, `grade`, `feedback`, `reviewedBy`).
- `Evaluation`: Final internship assessment submitted by Companies (`totalScore`, `recommendation`).
- `Notification`: System alerts alerting users of various events (e.g. report submitted, status updated).

---

## 4. Key Fixes & Progress History (Latest First)

### Clarification on Reports vs. Evaluations
- **Reports**: Weekly entries by the Student, graded by the **Supervisor**. Visible in the Student's `Reports` tab.
- **Evaluations**: A one-time final assessment submitted by the **Company**. Visible in the Student's `Evaluations` tab.

### Admin Initialization
- Created a `createAdmin.js` script in the `server` directory to securely seed an initial admin user directly into MongoDB, as the UI had no registration flow for admins.
- **Admin Credentials**: `admin@fieldtrack.com` / `password123`

### Student-Supervisor Assignment Feature
- **Issue**: Supervisors were seeing 0 reports and 0 students on their dashboard.
- **Cause**: Backend logic correctly filtered reports by `supervisor ID`, but there was no feature to link a student to a supervisor.
- **Fix**: Added `PUT /api/admin/students/:userId/assign-supervisor`.
- **UI**: Added a dropdown and "Assign Supervisor" button to the Admin Dashboard inside the `Users` tab. Admins can now manually link students to their supervisors.

### Dashboard Settings Page
- **Issue**: The Navbar "Dashboard Settings" link was non-functional and the related page didn't exist.
- **Fix**: Created `/dashboard/settings/page.js` relying on the existing `/auth/updateprofile` endpoint to let all roles change their details.
- **Bug Fix**: Handled a missing properties TypeError by adding optional chaining in the `fetchUser` effect.

### Internship Details Page
- **Issue**: Students experienced a 404 error when attempting to click "View Details" on an internship listing.
- **Fix**: Created `/internships/[id]/page.js` to fetch and display internship details and handle the "Apply" functionality.

### Dashboard Hash-Based Navigation
- **Issue**: Clicking Navbar/Sidebar links containing hashes (e.g. `/dashboard/admin#users`) didn't change the active tab.
- **Fix**: Replaced simple `<Link>` clicks with `window.location.hash` and wrapped tab state inside a `onHashChange` event listener utilizing `useEffect` across all dashboard modules (`admin`, `student`, `supervisor`, `company`).

---

## 5. How to Continue from Here
Whenever a new AI session starts, read this file first using the tool `view_file`. This will provide immediate context on the system's current state and boundaries, preventing redundant analysis or regression bugs.
