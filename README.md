# Exploratory Training Academy (ETA) Platform

> **Unified Academic, Training & Examination Management Platform**  
> _Empowering students, instructors, guardians, and academy administrators through an enterprise-grade, offline-capable academic operating system._  
> **Tagline:** _Learn • Explore • Grow_

[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-0284c7.svg)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21+-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-green.svg)](https://mongoosejs.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](<>)
[![Production](https://img.shields.io/badge/Production-Live-emerald.svg)](https://eta-web-omega.vercel.app)

---

## 🌐 Live Production Deployment

- **Production Web Application**: [https://eta-web-omega.vercel.app](https://eta-web-omega.vercel.app)
- **Primary Governance Specification**: [`docs/ETA_PRD_v1.0.md`](./docs/ETA_PRD_v1.0.md)
- **Automated CI/CD Workflow**: [`.github/workflows/deploy-vercel.yml`](./.github/workflows/deploy-vercel.yml)

---

## 📋 Table of Contents

1. [Overview & Core Value Proposition](#1-overview--core-value-proposition)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Technology Stack Matrix](#3-technology-stack-matrix)
4. [Role-Based Access Control (RBAC)](#4-role-based-access-control-rbac)
5. [Getting Started & Local Development](#5-getting-started--local-development)
6. [Production Deployment & Vercel Configuration](#6-production-deployment--vercel-configuration)
7. [System Architecture & Core Domain Engines](#7-system-architecture--core-domain-engines)
   - 7.1 [Academic Hierarchy Engine](#71-academic-hierarchy-engine)
   - 7.2 [Classroom & Learning Content Engine](#72-classroom--learning-content-engine)
   - 7.3 [Assignment & Rubric Evaluation Engine](#73-assignment--rubric-evaluation-engine)
   - 7.4 [Examination, Quiz & Question Bank Engine](#74-examination-quiz--question-bank-engine)
   - 7.5 [Attendance & Session Tracking Engine](#75-attendance--session-tracking-engine)
   - 7.6 [Grading, GPA & Gradebook Publishing Engine](#76-grading-gpa--gradebook-publishing-engine)
   - 7.7 [Admissions Lifecycle & Application Pipeline](#77-admissions-lifecycle--application-pipeline)
   - 7.8 [Guardian & Family Engagement Engine](#78-guardian--family-engagement-engine)
   - 7.9 [Communication, Announcements & Event Notifications](#79-communication-announcements--event-notifications)
   - 7.10 [Unified Academic Calendar Engine](#710-unified-academic-calendar-engine)
   - 7.11 [Academic Messaging & Collaboration](#711-academic-messaging--collaboration)
   - 7.12 [Digital Credentials & Public Certificate Verification](#712-digital-credentials--public-certificate-verification)
   - 7.13 [Finance, Invoicing & Fee Management](#713-finance-invoicing--fee-management)
   - 7.14 [Public CMS, Dynamic Landing Page & Course Catalog](#714-public-cms-dynamic-landing-page--course-catalog)
   - 7.15 [Knowledge Hub, Blog & Educational Resources](#715-knowledge-hub-blog--educational-resources)
   - 7.16 [Global Multi-Entity Search Engine](#716-global-multi-entity-search-engine)
   - 7.17 [Analytics, Role Dashboards & Export Engine](#717-analytics-role-dashboards--export-engine)
   - 7.18 [Immutable Audit Logging & Compliance](#718-immutable-audit-logging--compliance)
   - 7.19 [Bilingual Localization (i18n) & RTL Engine](#719-bilingual-localization-i18n--rtl-engine)
   - 7.20 [Offline-First PWA & Performance Optimization](#720-offline-first-pwa--performance-optimization)
   - 7.21 [Educational AI Engine ("Ask ETA")](#721-educational-ai-engine-ask-eta)
8. [Security & Architectural Guardrails](#8-security--architectural-guardrails)
9. [Official Brand Tokens & Design System](#9-official-brand-tokens--design-system)
10. [Quality Assurance & Verification Summary](#10-quality-assurance--verification-summary)
11. [License & Governance](#11-license--governance)

---

## 1. Overview & Core Value Proposition

The **Exploratory Training Academy (ETA)** platform is an enterprise-grade, multi-tenant academic and training management suite. Built to replace fragmented educational tools, ETA consolidates curriculum planning, interactive examinations, automated student onboarding, guardian oversight, and institutional governance into a single performant monorepo.

### Key Pillars

- **Strict Role-Based Governance**: Centralized RBAC covering Super Admins, Academy Administrators, Teachers, Students, Guardians, Staff, and Visitors.
- **Server-Authoritative Assessment Integrity**: Anti-cheat examination delivery with server-side timers, randomized questions, and automatic answer-key stripping.
- **Bilingual & Culturally Adaptive**: Seamless Arabic (RTL) and English (LTR) rendering with localized date formats, typography, and directionality.
- **Offline-First PWA Readiness**: Service worker asset caching, indexed offline storage, and automatic background synchronization.
- **Educational AI Companion ("Ask ETA")**: Grounded Retrieval-Augmented Generation (RAG) assistant with academic integrity guardrails, strict lesson context bounds, and an automated killswitch.

---

## 2. Monorepo Architecture

ETA utilizes **pnpm workspaces** and **Turborepo** for optimized caching, dependency graphs, and parallel execution:

```
eta-platform/
├── apps/
│   ├── web/                     # Next.js 15+ App Router, React 19, Tailwind CSS v4, PWA
│   └── api/                     # Node.js 22+ Express API service, Mongoose 8, Firebase Admin
├── packages/
│   ├── types/                   # Shared TypeScript models, DTOs, API envelopes, RBAC types
│   ├── config/                  # RBAC matrix, permission definitions, brand tokens, grading scales
│   ├── validation/              # Zod validation schemas for all requests, queries, and mutations
│   └── utils/                   # Shared utility helpers (slugify, pagination, math, object IDs)
├── ETA_Brand_Design_System/     # Brand SVGs, design guidelines, animated loader components
├── docs/                        # Primary PRD specification (ETA_PRD_v1.0.md)
└── .github/workflows/           # CI validation & automated Vercel production deployment
```

---

## 3. Technology Stack Matrix

| Domain                      | Technology                        | Purpose                                                                     |
| :-------------------------- | :-------------------------------- | :-------------------------------------------------------------------------- |
| **Frontend Framework**      | **Next.js 15+ (App Router)**      | Modern SSR, streaming layouts, metadata API, server actions                 |
| **UI & Styling**            | **Tailwind CSS v4 + Vanilla CSS** | Tokenized design system with custom CSS properties in `globals.css`         |
| **Icons & Brand**           | **Lucide React + Official SVGs**  | ETA Brand Design System, responsive iconography                             |
| **Client Authentication**   | **Firebase Client SDK (v12)**     | Client-side OAuth, email/password identity, ID token issuance               |
| **Backend Runtime**         | **Node.js 22+ / TypeScript 5.6+** | Robust ESM runtime with strict typing and modern Node APIs                  |
| **Backend Framework**       | **Express 4.21+**                 | Modular REST API routing, centralized error handlers, security middleware   |
| **Database & ODM**          | **MongoDB Atlas + Mongoose 8**    | Multi-collection document store with compound indexes and schema validation |
| **Admin Auth Verification** | **Firebase Admin SDK (v13)**      | Zero-trust token verification and user sync in middleware                   |
| **Validation Layer**        | **Zod 3.23+**                     | Compile-time & runtime schema validation across frontend and backend        |
| **Security Suite**          | **Helmet, CORS, Rate Limit**      | Hardened HTTP response headers, origin whitelisting, brute-force defense    |
| **Testing Framework**       | **Vitest 2.1+ / Playwright**      | Fast unit/integration testing suite (346 tests) and E2E browser testing     |
| **Build & Tooling**         | **Turborepo 2.11+ / pnpm 9**      | Monorepo task orchestration, pipeline caching, and dependency management    |

---

## 4. Role-Based Access Control (RBAC)

ETA implements a fail-closed, multi-tier RBAC architecture defined in [`packages/config/src/rbac.ts`](./packages/config/src/rbac.ts):

| Role              | Scope                    | Key Capabilities                                                                |
| :---------------- | :----------------------- | :------------------------------------------------------------------------------ |
| **`SUPER_ADMIN`** | Platform-wide            | Full governance, tenant provisioning, system configs, audit trail inspection    |
| **`ADMIN`**       | Academy-wide             | Cohort management, instructor assignments, financial oversight, admissions      |
| **`TEACHER`**     | Assigned Courses/Batches | Lesson authoring, assessment publishing, gradebook submission, roll call        |
| **`STUDENT`**     | Enrolled Cohorts         | Course participation, interactive quizzes, assignment submissions, certificates |
| **`GUARDIAN`**    | Linked Students          | Attendance tracking, academic progress review, fee invoices, teacher messaging  |
| **`STAFF`**       | Operational Support      | Admission reviews, announcement broadcasts, calendar updates                    |
| **`VISITOR`**     | Public Surface           | Public course catalog, admissions application, blog, certificate verification   |

---

## 5. Getting Started & Local Development

### Prerequisites

- **Node.js**: `>= 20.0.0` (Recommended: `v22.x`)
- **pnpm**: `>= 9.0.0`
- **MongoDB**: Active MongoDB Atlas cluster or local replica set (`>= 7.0`)
- **Firebase Project**: Firebase Auth project with Email/Password and Google providers enabled

### Installation

```bash
# 1. Clone repository
git clone https://github.com/MSabbirHossen/ETA.git
cd eta-platform

# 2. Install workspace dependencies
pnpm install
```

### Environment Configuration

```bash
# Configure backend API environment
cp apps/api/.env.example apps/api/.env

# Configure frontend Web environment
cp apps/web/.env.example apps/web/.env.local
```

#### Backend Environment Variables (`apps/api/.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/etaDB?retryWrites=true&w=majority
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_URL=https://eta-web-omega.vercel.app
SUPER_ADMIN_BOOTSTRAP_EMAIL=databaseadmin1@gmail.com
CRON_SECRET=development-cron-secret-32-characters-min
```

#### Frontend Environment Variables (`apps/web/.env.local`)

```env
NEXT_PUBLIC_APP_URL=https://eta-web-omega.vercel.app
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=709261369121
NEXT_PUBLIC_FIREBASE_APP_ID=1:709261369121:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

### Running Locally

```bash
# Run backend and frontend concurrently
pnpm dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 6. Production Deployment & Vercel Configuration

The web application is hosted on **Vercel** with continuous deployment wired to GitHub:

### Vercel Project Settings

1. **Monorepo Root Directory**: In **Project Settings** → **General**, ensure **Root Directory** is configured to:
   ```
   apps/web
   ```
   _(This ensures Vercel invokes Turborepo for `@eta/web` while resolving workspace dependencies)._
2. **Environment Variables**: Add all `NEXT_PUBLIC_*` keys listed in `apps/web/.env.example` to the Vercel dashboard.
3. **CI/CD Quality Gate**: [`.github/workflows/deploy-vercel.yml`](./.github/workflows/deploy-vercel.yml) automatically validates:
   - Workspace Linting (`pnpm lint`)
   - TypeScript Type Checking (`pnpm type-check`)
   - Complete Vitest Test Suite (`pnpm test` — 346 tests)
   - Application Production Build (`pnpm build`)

---

## 7. System Architecture & Core Domain Engines

```mermaid
graph TD
    Client[Next.js 15 Client / PWA] -->|HTTPS / CORS| API[Express API Gateway :5000]
    API --> Auth[Firebase Admin Token Guard]
    API --> Zod[Zod Validation Layer]
    Auth --> RBAC[Role-Permission Matrix]
    RBAC --> Modules[Academic Modules & Services]
    Modules --> DB[(MongoDB Atlas)]
    Modules --> AI[Educational AI Engine / OpenAI]
    Modules --> Audit[Immutable Audit Logger]
```

### 7.1 Academic Hierarchy Engine

Governs the core scholastic hierarchy: **Programs → Courses → Batches (Cohorts) → Subjects → Modules → Enrollments**.

- **Cohort Capacity Enforcement**: Hard student caps preventing over-enrollment.
- **Relational Integrity**: Strict cascade protection preventing orphan curricular entities.
- **Key Endpoints**:
  - `GET /api/v1/programs` / `POST /api/v1/programs`
  - `GET /api/v1/courses` / `POST /api/v1/courses`
  - `GET /api/v1/batches` / `POST /api/v1/batches`
  - `POST /api/v1/enrollments` / `GET /api/v1/enrollments/my-enrollments`

### 7.2 Classroom & Learning Content Engine

Manages interactive lectures, live class timetables, and modular lesson sequences.

- **Sequential Unlocking**: Enforces prerequisite module completion before unlocking advanced lessons.
- **Resource Security**: Protected attachments served through role-authenticated access gates.
- **Key Endpoints**:
  - `GET /api/v1/classes` / `POST /api/v1/classes`
  - `GET /api/v1/lessons` / `POST /api/v1/lessons`
  - `POST /api/v1/lessons/:id/complete`

### 7.3 Assignment & Rubric Evaluation Engine

Handles student coursework, deadlines, rubric criteria, and instructor feedback.

- **Late Submission Handling**: Automatic penalty calculation or hard cutoff based on batch settings.
- **AI Rubric Suggestions**: Optional AI evaluation assistant that generates advisory feedback without modifying final grades.
- **Key Endpoints**:
  - `GET /api/v1/assignments` / `POST /api/v1/assignments`
  - `POST /api/v1/assignments/:id/submissions`
  - `POST /api/v1/submissions/:id/grade`

### 7.4 Examination, Quiz & Question Bank Engine

Server-authoritative assessment engine engineered for absolute academic integrity:

- **Server-Authoritative Timer**: Clock countdown calculated as `min(now + duration, closesAt)` — immune to client clock manipulation.
- **Anti-Cheat Serialization**: Student payloads explicitly strip `correctAnswer`, `isCorrect`, and explanations on the server.
- **Randomization Stability**: Questions and options are randomized once per attempt and persisted to prevent refresh exploitation.
- **Key Endpoints**:
  - `GET /api/v1/quizzes` / `POST /api/v1/quizzes`
  - `POST /api/v1/quizzes/:id/attempts/start`
  - `POST /api/v1/quiz-attempts/:id/submit`

### 7.5 Attendance & Session Tracking Engine

Tracks live student presence across physical and virtual lectures:

- **Status Lifecycle**: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`.
- **Automated Absence Thresholds**: Trigger alert events when attendance falls below institutional policy (e.g., 75%).
- **Key Endpoints**:
  - `POST /api/v1/attendance/mark`
  - `GET /api/v1/attendance/student/:id`
  - `GET /api/v1/attendance/batch/:id/summary`

### 7.6 Grading, GPA & Gradebook Publishing Engine

Enterprise grading matrix with publish/lock workflows:

- **Weighted GPA & Formula Evaluation**: Computes percentage and letter grades from quizzes, assignments, and exams.
- **Gradebook Locking**: Once published by an administrator, grades are cryptographically locked against unauthorized mutation.
- **Key Endpoints**:
  - `GET /api/v1/gradebook/:batchId`
  - `POST /api/v1/gradebook/:batchId/calculate`
  - `POST /api/v1/gradebook/:batchId/publish`

### 7.7 Admissions Lifecycle & Application Pipeline

Public student application onboarding workflow:

- **Status Transitions**: `SUBMITTED` → `UNDER_REVIEW` → `INTERVIEW_SCHEDULED` → `ACCEPTED` / `REJECTED`.
- **One-Click Cohort Provisioning**: Automatically registers accepted applicants into student accounts and cohort enrollments.
- **Key Endpoints**:
  - `POST /api/v1/admissions/apply` (Public)
  - `GET /api/v1/admissions/applications` (Staff/Admin)
  - `PATCH /api/v1/admissions/applications/:id/status`

### 7.8 Guardian & Family Engagement Engine

Empowers parents and sponsors with real-time insight into student academic performance:

- **Multi-Student Linking**: Guardians can securely oversee multiple enrolled siblings from a single dashboard.
- **Direct Faculty Communication**: Dedicated messaging channels between guardians and instructors.
- **Key Endpoints**:
  - `GET /api/v1/guardian/wards`
  - `GET /api/v1/guardian/wards/:id/attendance`
  - `GET /api/v1/guardian/wards/:id/grades`

### 7.9 Communication, Announcements & Event Notifications

Targeted broadcast system with granular recipient scopes:

- **Audience Targeting**: `ALL_ACADEMY`, `ROLE_SPECIFIC`, `COURSE_SPECIFIC`, `BATCH_SPECIFIC`.
- **In-App Notification Dispatcher**: Real-time push updates for grade publications, deadlines, and schedule adjustments.
- **Key Endpoints**:
  - `GET /api/v1/announcements` / `POST /api/v1/announcements`
  - `GET /api/v1/notifications` / `PATCH /api/v1/notifications/:id/read`

### 7.10 Unified Academic Calendar Engine

Aggregates term schedules, exam dates, submission cutoffs, and holidays:

- **Role-Filtered Events**: Tailors event feeds so students only see relevant cohort milestones.
- **Key Endpoints**:
  - `GET /api/v1/calendar/events`
  - `POST /api/v1/calendar/events` (Admin/Teacher)

### 7.11 Academic Messaging & Collaboration

Internal secure communication channels between educational stakeholders:

- **Threaded Conversations**: Direct and cohort-level messaging with file attachment guardrails.
- **Key Endpoints**:
  - `GET /api/v1/messages/threads`
  - `POST /api/v1/messages/send`

### 7.12 Digital Credentials & Public Certificate Verification

Cryptographically verified credentials for course and program graduates:

- **Public Verification Surface**: Accessible at `/certificate/verify/[code]` with zero authentication required.
- **Tamper Resistance**: Unique credential hashes verified against immutable graduation records.
- **Key Endpoints**:
  - `GET /api/v1/certificates/verify/:code` (Public)
  - `POST /api/v1/certificates/issue` (Admin)

### 7.13 Finance, Invoicing & Fee Management

Tuition billing, installment plans, and transaction receipts:

- **Lifecycle Tracking**: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`.
- **Key Endpoints**:
  - `GET /api/v1/finance/invoices`
  - `POST /api/v1/finance/invoices/:id/record-payment`

### 7.14 Public CMS, Dynamic Landing Page & Course Catalog

Public catalog management allowing administrators to update academy marketing pages:

- **Dynamic Site Settings**: Academy branding, vision/mission, contact information, and FAQs.
- **Public Course Showcase**: Searchable list of offered programs, course prerequisites, and faculty bios.
- **Key Endpoints**:
  - `GET /api/v1/cms/public/home` (Public)
  - `PUT /api/v1/cms/settings` (Admin)

### 7.15 Knowledge Hub, Blog & Educational Resources

Integrated technical publishing platform:

- **Curated Articles & Resources**: Markdown-rendered tutorials, downloadable reference sheets, and updates.
- **Key Endpoints**:
  - `GET /api/v1/blog` / `GET /api/v1/blog/:slug`
  - `GET /api/v1/resources` / `GET /api/v1/resources/:slug`

### 7.16 Global Multi-Entity Search Engine

Instant indexing across curricular courses, lessons, announcements, and resources:

- **Role-Aware Filtering**: Results respect user permissions (e.g., students only discover accessible course materials).
- **Key Endpoints**:
  - `GET /api/v1/search?q=:query`

### 7.17 Analytics, Role Dashboards & Export Engine

Role-tailored metrics and institutional reporting:

- **Dashboards**: Cohort GPA distribution, attendance rates, admission conversion funnels, and revenue metrics.
- **Secure CSV/PDF Exports**: Parameterized report generation with streaming downloads.
- **Key Endpoints**:
  - `GET /api/v1/analytics/overview`
  - `GET /api/v1/reports/export?format=csv`

### 7.18 Immutable Audit Logging & Compliance

Strict compliance ledger documenting sensitive institutional operations:

- **Write-Only / Immutability**: Audit records cannot be modified or deleted via API (`GET` routes only).
- **Recorded Events**: Grade modifications, role escalations, admission approvals, and security alerts.
- **Key Endpoints**:
  - `GET /api/v1/audit-logs` (Super Admin Only)
  - `GET /api/v1/audit-logs/export`

### 7.19 Bilingual Localization (i18n) & RTL Engine

Built-in native support for English and Arabic:

- **Bidirectional CSS (LTR / RTL)**: Directional layout adaptation via `dir="rtl"` and logical properties.
- **Cookie Persistence**: Remembers user language preference via `NEXT_LOCALE` cookie across sessions.
- **Key Translation Dictionaries**: Located in `apps/web/src/i18n/`.

### 7.20 Offline-First PWA & Performance Optimization

Progressive Web App providing offline resiliency:

- **Service Worker Lifecycle**: Prefetches application shells, core CSS tokens, and public catalogs.
- **Offline Fallback Route**: Graceful degraded mode at `/offline` when network connectivity drops.
- **Manifest**: Complete Web App Manifest with branded Android/iOS home-screen icons.

### 7.21 Educational AI Engine ("Ask ETA")

Context-bounded Retrieval-Augmented Generation (RAG) assistant:

- **Academic Guardrails**: Queries are strictly bounded to verified curriculum lessons; AI is locked during active exam attempts.
- **Provider Architecture**: Native OpenAI integration with built-in mock and automated killswitch mechanisms.
- **PII Redaction**: Student names, contact information, and grade histories are redacted prior to upstream AI transmission.
- **Key Endpoints**:
  - `POST /api/v1/ai/chat` (Ask ETA)
  - `POST /api/v1/ai/generate-quiz` (Teacher Tool)
  - `POST /api/v1/ai/rubric-assistant` (Teacher Advisory)

---

## 8. Security & Architectural Guardrails

1. **Zero-Trust Token Verification**: Every authenticated request validates Firebase JWTs against the Firebase Admin SDK on the backend.
2. **CORS Origin Normalization**: The API normalizes trailing slashes so requests from `https://eta-web-omega.vercel.app` and development ports match securely.
3. **Fail-Closed Permissions**: Endpoints check granular permission tokens (e.g., `ACADEMIC_COURSE_CREATE`), not merely broad role strings.
4. **Parameterized Database Queries**: All Mongoose queries use typed schemas and strict object validation to prevent NoSQL injection.
5. **Sanitized Error Envelopes**: In production, stack traces and internal database errors are suppressed into sanitized `{ success: false, error: { message, code } }` structures.

---

## 9. Official Brand Tokens & Design System

The platform strictly implements the official ETA Brand Design System tokens:

| Token Name      | Hex Code  | Purpose                                         |
| :-------------- | :-------- | :---------------------------------------------- |
| **Navy**        | `#073C84` | Primary Anchor, Header Background, Key CTAs     |
| **Deep Blue**   | `#0752B5` | Secondary Brand Element, Card Headers           |
| **Blue**        | `#0B7CEB` | Interactive Elements, Hover States, Active Tabs |
| **Bright Blue** | `#129BFF` | Focus Rings, Highlights, Progress Indicators    |
| **Cyan**        | `#16C4FF` | Energetic Glow Accents, Badges, Metrics         |
| **Ink**         | `#071B3B` | Dark Mode Surface Canvas, Deep Backgrounds      |
| **White**       | `#FFFFFF` | Text Contrast, Light Surfaces                   |

---

## 10. Quality Assurance & Verification Summary

The workspace maintains a strict quality bar verified on every commit:

```bash
# Execute complete unit & integration test suite
pnpm test
```

### Current Test Suite Status

- **Total Test Files**: 32 passed (100%)
- **Total Unit & Integration Tests**: 346 passed (100%)
- **TypeScript Type Check**: 6/6 workspace packages passed cleanly (`pnpm type-check`)
- **ESLint Code Quality**: 0 errors across monorepo (`pnpm lint`)

---

## 11. License & Governance

**Proprietary & Confidential**  
Copyright © 2026 **Exploratory Training Academy (ETA)**. All rights reserved.  
Unauthorized copying, modification, distribution, or reverse engineering of this software via any medium is strictly prohibited. Governed under institutional licensing terms.
