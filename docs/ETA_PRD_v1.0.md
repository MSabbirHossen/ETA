# Exploratory Training Academy (ETA)
## Product Requirements Document (PRD)

**Product Name:** Exploratory Training Academy  
**Short Name:** ETA  
**Document Type:** Product Requirements Document  
**Version:** 1.0  
**Status:** Development Ready  
**Primary Use:** AI-assisted software development from MVP to production  
**Target Platforms:** Web, Responsive Web, Progressive Web App (PWA)  
**Primary Repository Strategy:** Monorepo  
**Primary Frontend:** Next.js + TypeScript  
**Primary Backend:** Node.js + Express + TypeScript  
**Authentication:** Firebase Authentication  
**Database:** MongoDB Atlas  
**File Storage:** Cloudflare R2 and/or Cloudinary  
**Deployment:** Vercel + managed Node.js hosting  
**Source Control:** GitHub + GitHub Actions  

---

# 1. Executive Summary

Exploratory Training Academy (ETA) is a complete digital education management platform designed for an educational institution that may operate fully online, physically, or in a hybrid model.

ETA is not only a public academy website. It is a unified academic operating system that combines:

- Public website
- Learning Management System (LMS)
- Student Information System
- Teacher management
- Guardian monitoring
- Academic administration
- Assignment management
- Quiz and examination systems
- Attendance
- Gradebook and results
- Class scheduling
- Learning materials
- Communication
- Notifications
- Admissions
- Certificates
- Finance
- Content management
- Reporting and analytics
- Multi-language support
- Future AI-assisted learning

The platform must provide a different experience for each type of user based on their role, responsibilities, current tasks, and personal context.

The core user roles are:

1. Visitor
2. Student
3. Teacher
4. Guardian
5. Staff
6. Admin
7. Super Admin

The platform must be architected in a way that additional roles such as course coordinator, mentor, examiner, finance officer, content manager, moderator, and support staff can be introduced later without major restructuring.

---

# 2. Product Vision

The vision of ETA is to provide one modern, scalable, interactive platform where the complete lifecycle of an educational institution can be managed.

A student should be able to:

- discover courses,
- enroll,
- attend classes,
- access lessons,
- watch recordings,
- read materials,
- submit assignments,
- take quizzes,
- sit for exams,
- view grades,
- track attendance,
- communicate with teachers,
- receive certificates,
- and monitor their own progress.

A teacher should be able to:

- manage assigned courses,
- create classes,
- upload lessons,
- manage materials,
- create assignments,
- create quizzes and exams,
- mark attendance,
- grade students,
- provide feedback,
- publish announcements,
- and monitor student progress.

A guardian should be able to:

- monitor linked children,
- track attendance,
- track grades,
- view upcoming academic events,
- monitor course progress,
- see teacher feedback,
- and receive relevant notices.

An administrator should be able to:

- manage users,
- manage teachers,
- manage students,
- manage academic programs,
- manage batches,
- manage enrollment,
- manage schedules,
- manage exams,
- manage results,
- manage content,
- manage finance,
- manage certificates,
- manage public website content,
- monitor analytics,
- configure settings,
- and audit sensitive activities.

---

# 3. Product Goals

## 3.1 Primary Goals

1. Centralize all ETA academic operations.
2. Replace fragmented tools with a single platform.
3. Provide role-specific experiences.
4. Make academic management easy for teachers and administrators.
5. Make learning simple and structured for students.
6. Allow guardians to monitor academic progress.
7. Support future scale to multiple programs, batches, subjects, and thousands of students.
8. Enable future mobile apps without rebuilding the backend.
9. Support future AI features without changing the fundamental architecture.
10. Maintain strong security, privacy, reliability, and auditability.

## 3.2 Secondary Goals

- Provide a modern public-facing academy website.
- Improve enrollment conversion.
- Provide verifiable digital certificates.
- Support automated academic workflows.
- Provide institutional analytics.
- Support Bangla, English, and Arabic.
- Support RTL for Arabic.
- Allow eventual Google Calendar, Zoom, Meet, WhatsApp, and email integrations.

---

# 4. Non-Goals for Initial V1

The following should NOT block the first production release:

- native Android application,
- native iOS application,
- complex AI proctoring,
- face recognition,
- biometric attendance,
- advanced payment gateway integrations,
- live collaborative whiteboards,
- in-platform video conferencing infrastructure,
- full WhatsApp replacement,
- advanced AI tutoring,
- predictive machine-learning analytics,
- complex ERP accounting,
- hostel management,
- payroll.

These may be introduced later.

---

# 5. Product Principles

The system should follow these principles.

## 5.1 Role-first design

Every dashboard must answer the most important question for that role.

Student:
> What should I learn or do next?

Teacher:
> What should I teach, review, or grade next?

Guardian:
> How is my child progressing?

Admin:
> How is the academy operating?

## 5.2 Mobile-first student experience

Students will frequently use phones.

Teacher workflows should prioritize tablet/laptop.

Admin workflows should prioritize desktop.

## 5.3 No duplicated sources of truth

Academic data must live in structured database entities rather than hard-coded pages.

## 5.4 Backend-enforced authorization

UI visibility is not security.

Every sensitive API operation must validate the authenticated user's permissions.

## 5.5 Modular architecture

Course, exam, user, attendance, notification, finance, and content modules must be separated logically.

## 5.6 Progressive complexity

Build a reliable V1 before adding AI and advanced automation.

---

# 6. User Roles

## 6.1 Visitor

A visitor is an unauthenticated public user.

Capabilities:

- view homepage,
- view programs,
- view courses,
- view teachers,
- view public notices,
- view events,
- view public results where applicable,
- read blog/resources,
- contact ETA,
- register,
- log in,
- apply for admission,
- enroll in public/open courses.

---

## 6.2 Student

Capabilities:

- dashboard,
- enrolled courses,
- lessons,
- materials,
- recordings,
- assignments,
- submissions,
- quizzes,
- exams,
- results,
- attendance,
- calendar,
- progress,
- notifications,
- announcements,
- messages,
- profile,
- certificates,
- payments where enabled.

---

## 6.3 Teacher

Capabilities:

- dashboard,
- assigned courses,
- assigned batches,
- student lists,
- lesson creation,
- materials,
- class scheduling,
- attendance,
- assignments,
- question bank,
- quizzes,
- exams,
- grading,
- results,
- progress monitoring,
- announcements,
- messages,
- calendar.

---

## 6.4 Guardian

Capabilities:

- dashboard,
- linked children,
- child courses,
- child attendance,
- grades,
- progress,
- assignment status,
- exam results,
- teacher feedback,
- notices,
- messages,
- payments,
- calendar.

---

## 6.5 Staff

Staff permissions depend on assigned role.

Examples:

- admissions staff,
- academic officer,
- finance officer,
- content manager,
- support representative.

Staff must not automatically receive unrestricted admin privileges.

---

## 6.6 Admin

Capabilities:

- manage users,
- manage courses,
- manage batches,
- manage enrollments,
- manage academics,
- manage classes,
- manage results,
- manage public content,
- manage announcements,
- manage reports,
- manage certificates,
- manage finance,
- manage role assignments within allowed scope.

---

## 6.7 Super Admin

Super Admin has system-wide control.

Capabilities include:

- all admin permissions,
- create admins,
- assign privileged roles,
- configure global settings,
- manage permission policies,
- view audit logs,
- manage integrations,
- manage destructive or high-risk actions.

---

# 7. Multi-Role Users

A user may have multiple roles.

Example:

```json
{
  "roles": ["teacher", "admin"]
}
```

The system must support:

- default active role,
- role switching,
- role-specific dashboard,
- role-specific permissions,
- one shared authentication identity.

---

# 8. Role-Based Access Control (RBAC)

Permissions must be granular.

Examples:

```text
user:view
user:create
user:update
user:suspend
user:delete

student:view
student:update
student:enroll

teacher:view
teacher:assign

program:create
program:update
program:delete

course:create
course:update
course:delete

batch:create
batch:update

lesson:create
lesson:update
lesson:delete

material:create
material:update
material:delete

class:create
class:update
class:cancel

attendance:take
attendance:update

assignment:create
assignment:grade

quiz:create
quiz:publish
quiz:grade

exam:create
exam:publish
exam:grade

grade:view
grade:update

certificate:issue
certificate:revoke

finance:view
finance:manage

cms:update

analytics:view

role:assign

audit:view

settings:update
```

Permissions must be evaluated on the backend.

---

# 9. Authentication

Use Firebase Authentication.

## 9.1 V1 Authentication Methods

- Email/password
- Google sign-in
- Email verification
- Password reset

## 9.2 Future Authentication Methods

- Phone authentication
- Microsoft
- Apple
- SSO for institutions

## 9.3 Authentication Flow

```text
Firebase Authentication
        ↓
Firebase ID Token
        ↓
Frontend
        ↓
Backend API
        ↓
Firebase Admin SDK verification
        ↓
MongoDB user lookup
        ↓
Role + permission verification
        ↓
Authorized request
```

## 9.4 User Record

MongoDB stores the application profile.

Example:

```json
{
  "_id": "ObjectId",
  "firebaseUid": "firebase-id",
  "name": "Example User",
  "email": "user@example.com",
  "phone": null,
  "avatarUrl": null,
  "roles": ["student"],
  "status": "active",
  "preferredLanguage": "en",
  "timezone": "Asia/Riyadh",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

---

# 10. Public Website Information Architecture

```text
/
├── Home
├── About
│   ├── About ETA
│   ├── Mission & Vision
│   ├── Leadership
│   └── Teachers
│
├── Programs
│   ├── Program Listing
│   └── Program Details
│
├── Courses
│   ├── All Courses
│   ├── Course Details
│   ├── Upcoming Courses
│   └── Free Courses
│
├── Schedule
├── Events
├── Results
├── Notices
├── Blog
├── Resources
├── Success Stories
├── FAQ
├── Contact
├── Apply
├── Login
└── Register
```

---

# 11. Homepage Requirements

Homepage sections may include:

1. Announcement bar
2. Navigation
3. Hero
4. CTA buttons
5. Featured programs
6. Upcoming courses
7. Why ETA
8. Statistics
9. Featured teachers
10. Student testimonials
11. Upcoming events
12. Latest notices
13. Learning resources
14. FAQ
15. Newsletter
16. Footer

Admin must be able to manage public homepage content through CMS.

---

# 12. Academic Hierarchy

Use this hierarchy:

```text
Program
   ↓
Course
   ↓
Batch / Cohort
   ↓
Subject
   ↓
Module
   ↓
Lesson
   ↓
Content / Material
```

This hierarchy must remain flexible.

---

# 13. Program

Program fields:

- name,
- slug,
- short description,
- long description,
- cover image,
- category,
- status,
- eligibility,
- duration,
- language,
- learning outcomes,
- curriculum summary,
- certificate availability,
- enrollment status,
- SEO metadata.

Statuses:

- draft,
- active,
- archived.

---

# 14. Course

Course fields:

- program ID,
- title,
- slug,
- code,
- description,
- thumbnail,
- level,
- language,
- duration,
- estimated study hours,
- learning outcomes,
- prerequisites,
- teacher IDs,
- subject IDs,
- certificate rules,
- visibility,
- publication status.

Visibility:

- public,
- private,
- enrollment-only.

---

# 15. Batch / Cohort

Fields:

- course ID,
- batch name,
- batch code,
- start date,
- end date,
- enrollment start,
- enrollment end,
- student limit,
- teachers,
- meeting schedule,
- status.

Statuses:

- upcoming,
- active,
- completed,
- archived.

---

# 16. Subject

Fields:

- title,
- code,
- description,
- course ID,
- teacher IDs,
- sequence,
- total marks,
- passing rules.

---

# 17. Module

Fields:

- subject ID,
- title,
- description,
- sequence,
- unlock rules,
- publication status.

---

# 18. Lesson

Lesson fields:

- module ID,
- title,
- description,
- sequence,
- lesson type,
- estimated duration,
- body content,
- video URL,
- recording URL,
- attachments,
- learning objectives,
- publication date,
- completion rule,
- visibility.

Lesson types:

- text,
- video,
- audio,
- live class,
- mixed.

---

# 19. Learning Materials

Supported resources:

- PDF
- DOCX
- PPTX
- image
- audio
- video
- YouTube
- external link
- Google Drive link
- GitHub
- ZIP
- source code
- text content
- embedded content

Material fields:

- lesson ID,
- title,
- description,
- type,
- URL,
- file size,
- MIME type,
- uploadedBy,
- downloadable,
- createdAt.

---

# 20. Progress Tracking

The platform should track:

- lesson opened,
- lesson started,
- lesson completed,
- material accessed,
- completion percentage,
- last accessed,
- study activity,
- optional estimated time spent.

Avoid inaccurate invasive tracking.

Progress calculations must be transparent.

---

# 21. Live Class Management

Teacher/Admin can create class sessions.

Fields:

- class title,
- batch ID,
- course ID,
- subject ID,
- teacher ID,
- date,
- start time,
- end time,
- timezone,
- platform,
- meeting URL,
- meeting ID,
- description,
- attachments,
- attendance requirement,
- recording URL,
- status.

Platforms:

- Zoom
- Google Meet
- Microsoft Teams
- External URL
- Other

Statuses:

- scheduled,
- live,
- completed,
- cancelled,
- rescheduled.

---

# 22. Student Class Experience

Student should see:

- class title,
- teacher,
- date,
- time,
- countdown,
- class link,
- materials,
- status,
- attendance requirement,
- recording after completion,
- notes,
- homework.

CTA:

- Join Class
- View Recording
- View Materials

---

# 23. Student Dashboard

Dashboard widgets:

- greeting,
- active courses,
- next class,
- today's schedule,
- pending assignments,
- upcoming quizzes,
- upcoming exams,
- recent results,
- attendance percentage,
- learning progress,
- announcements,
- notification preview,
- continue learning,
- certificates.

Priority order should favor urgent tasks.

---

# 24. Student Routes

```text
/student
/student/dashboard
/student/courses
/student/courses/:courseId
/student/courses/:courseId/modules
/student/lessons/:lessonId
/student/classes
/student/calendar
/student/assignments
/student/assignments/:assignmentId
/student/quizzes
/student/quizzes/:quizId
/student/exams
/student/exams/:examId
/student/results
/student/grades
/student/attendance
/student/progress
/student/certificates
/student/messages
/student/notifications
/student/payments
/student/profile
/student/settings
```

---

# 25. Teacher Dashboard

Widgets:

- today's classes,
- upcoming classes,
- pending grading,
- assignment submission count,
- active batches,
- student attendance issues,
- weak-performing students,
- recent announcements,
- unread messages,
- quick actions.

Quick actions:

- create class,
- upload lesson,
- create assignment,
- create quiz,
- mark attendance,
- publish announcement.

---

# 26. Teacher Routes

```text
/teacher
/teacher/dashboard
/teacher/courses
/teacher/batches
/teacher/students
/teacher/classes
/teacher/classes/new
/teacher/content
/teacher/modules
/teacher/lessons
/teacher/materials
/teacher/assignments
/teacher/question-bank
/teacher/quizzes
/teacher/exams
/teacher/gradebook
/teacher/attendance
/teacher/progress
/teacher/announcements
/teacher/messages
/teacher/calendar
/teacher/profile
/teacher/settings
```

---

# 27. Guardian Dashboard

Widgets:

- child selector,
- attendance,
- current courses,
- average grade,
- upcoming exams,
- missing assignments,
- recent results,
- teacher feedback,
- notices,
- payments.

Support multiple children.

---

# 28. Guardian Routes

```text
/guardian
/guardian/dashboard
/guardian/children
/guardian/children/:studentId
/guardian/children/:studentId/courses
/guardian/children/:studentId/attendance
/guardian/children/:studentId/results
/guardian/children/:studentId/progress
/guardian/children/:studentId/assignments
/guardian/children/:studentId/feedback
/guardian/payments
/guardian/notices
/guardian/messages
/guardian/profile
/guardian/settings
```

---

# 29. Admin Dashboard

Widgets:

- total students,
- active students,
- teachers,
- active courses,
- active batches,
- classes today,
- enrollment statistics,
- attendance rate,
- upcoming exams,
- outstanding grading,
- revenue if finance enabled,
- payment dues,
- system alerts,
- recent admin actions.

---

# 30. Admin Routes

```text
/admin
/admin/dashboard

/admin/users
/admin/students
/admin/teachers
/admin/guardians
/admin/staff
/admin/admins

/admin/programs
/admin/courses
/admin/subjects
/admin/batches
/admin/enrollments
/admin/classes
/admin/calendar

/admin/admissions
/admin/applications
/admin/applications/review
/admin/applications/accepted

/admin/assignments
/admin/quizzes
/admin/exams
/admin/results
/admin/attendance
/admin/certificates

/admin/finance
/admin/payments
/admin/invoices
/admin/discounts
/admin/scholarships

/admin/cms
/admin/cms/home
/admin/cms/notices
/admin/cms/events
/admin/cms/blog
/admin/cms/faq
/admin/cms/testimonials

/admin/announcements
/admin/notifications
/admin/messages

/admin/reports
/admin/analytics
/admin/audit
/admin/roles
/admin/permissions
/admin/integrations
/admin/settings
```

---

# 31. Assignment System

## 31.1 Assignment Creation

Fields:

- title,
- description,
- instructions,
- course,
- batch,
- subject,
- teacher,
- attachments,
- total marks,
- publish date,
- due date,
- allow late submission,
- late penalty,
- submission type,
- maximum attempts,
- resubmission allowed.

Submission types:

- text,
- file,
- URL,
- mixed.

## 31.2 Assignment Status

```text
draft
scheduled
published
submitted
late
under_review
graded
resubmission_requested
completed
```

## 31.3 Student Submission

Fields:

- student ID,
- assignment ID,
- text answer,
- file attachments,
- URL,
- submittedAt,
- attempt number,
- late status.

## 31.4 Grading

Teacher can:

- assign score,
- add comments,
- add private notes,
- request resubmission,
- attach feedback file.

---

# 32. Question Bank

Questions must be reusable.

Question types:

- MCQ
- multiple select
- true/false
- short answer
- long answer
- fill in blank
- matching
- ordering
- numerical
- file upload

Fields:

- question text,
- type,
- options,
- correct answer,
- explanation,
- marks,
- difficulty,
- tags,
- subject,
- topic,
- creator,
- status.

---

# 33. Quiz System

Quiz fields:

- title,
- description,
- course,
- batch,
- subject,
- instructions,
- questions,
- question pool,
- total marks,
- pass mark,
- start time,
- end time,
- time limit,
- attempt limit,
- shuffle questions,
- shuffle options,
- random selection,
- negative marking,
- auto grading,
- result release policy,
- explanation release policy.

Result release options:

- immediately,
- after submission window,
- manually.

---

# 34. Quiz Attempt

Attempt data:

- quiz ID,
- student ID,
- startedAt,
- submittedAt,
- answers,
- score,
- percentage,
- pass/fail,
- attempt number,
- time used,
- auto graded score,
- manual grade status.

---

# 35. Examination System

Exams require stronger controls.

Features:

- exam schedule,
- exam instructions,
- sections,
- question navigation,
- server-side timer,
- autosave,
- answer persistence,
- start confirmation,
- submission confirmation,
- auto submit on timeout,
- one active attempt,
- exam activity logging.

Exam controls:

- randomized questions,
- randomized options,
- access window,
- allowed attempts,
- IP/device metadata logging,
- tab-change logging where appropriate,
- submit lock.

Do not implement invasive camera surveillance in V1.

---

# 36. Exam Status

```text
draft
scheduled
open
closed
grading
result_published
archived
```

---

# 37. Gradebook

Gradebook supports configurable categories.

Example:

```text
Quiz        10%
Assignment  20%
Midterm     25%
Final       35%
Attendance  10%
```

No percentage should be hard-coded.

Fields:

- grading category,
- weight,
- maximum marks,
- obtained marks,
- calculated contribution,
- final percentage,
- letter grade,
- GPA where applicable,
- comments.

---

# 38. Result Publishing

Results may be:

- draft,
- teacher reviewed,
- admin approved,
- published,
- corrected,
- archived.

Optional result approval flow:

```text
Teacher submits
      ↓
Academic Admin reviews
      ↓
Result published
```

---

# 39. Attendance

Attendance statuses:

- present,
- absent,
- late,
- excused,
- leave.

Attendance may be taken per class session.

Fields:

- classSession ID,
- student ID,
- status,
- markedBy,
- markedAt,
- note.

Student sees attendance percentage and history.

Guardian sees linked student's attendance.

---

# 40. Future Attendance Extensions

- QR attendance
- attendance code
- geofenced attendance
- biometric integration
- automatic meeting attendance import

These are not required for V1.

---

# 41. Enrollment

Enrollment entity must connect:

- student,
- course,
- batch,
- enrollment date,
- status,
- source,
- payment status,
- progress,
- completion status.

Statuses:

- pending,
- active,
- completed,
- dropped,
- suspended,
- cancelled.

---

# 42. Admissions

Application flow:

```text
Application submitted
      ↓
Document review
      ↓
Shortlisted
      ↓
Interview / evaluation if required
      ↓
Accepted / rejected
      ↓
Enrollment
```

Application fields:

- applicant info,
- program,
- course,
- education,
- contact details,
- guardian,
- attachments,
- status,
- reviewer notes.

---

# 43. Guardian Linking

Guardian-student relationship fields:

- guardian user ID,
- student user ID,
- relationship,
- verified,
- linkedBy,
- permissions.

Relationship examples:

- father,
- mother,
- sibling,
- legal guardian,
- other.

---

# 44. Announcements

Announcement audiences:

- public,
- all users,
- students,
- teachers,
- guardians,
- admins,
- course,
- batch,
- selected users.

Fields:

- title,
- body,
- attachments,
- audience,
- priority,
- publishAt,
- expiresAt,
- createdBy.

Priorities:

- normal,
- important,
- urgent.

---

# 45. Notifications

Notification triggers include:

- new class,
- class changed,
- class cancelled,
- new lesson,
- new material,
- assignment published,
- deadline approaching,
- assignment graded,
- quiz published,
- exam scheduled,
- exam result published,
- attendance issue,
- announcement,
- payment due,
- certificate issued.

Channels:

- in-app,
- email,
- push later,
- WhatsApp later.

---

# 46. Calendar

Unified academic calendar includes:

- classes,
- exams,
- quizzes,
- assignment deadlines,
- events,
- holidays,
- academic deadlines.

Views:

- month,
- week,
- day,
- agenda.

Role-specific filtering required.

Future:
- Google Calendar sync,
- ICS export.

---

# 47. Messaging

V1 messaging should be structured and simple.

Allowed flows may include:

- student → teacher,
- teacher → student,
- guardian → teacher,
- admin → user,
- support → user.

Features:

- conversation list,
- message thread,
- unread state,
- timestamp,
- basic attachments,
- archive.

Do not attempt to rebuild WhatsApp.

---

# 48. Certificates

Certificate issuance rules may include:

- course progress threshold,
- attendance threshold,
- final score threshold,
- payment status,
- admin approval.

Certificate fields:

- certificate ID,
- student,
- course,
- issue date,
- certificate type,
- verification code,
- PDF URL,
- status.

Statuses:

- issued,
- revoked.

---

# 49. Certificate Verification

Public route:

```text
/certificate/verify/:certificateId
```

Display:

- certificate status,
- student name,
- program/course,
- issue date,
- issuing institution,
- QR code.

Do not expose unnecessary private information.

---

# 50. Finance Module

This module may be Phase 2+ but schema should be considered early.

Entities:

- fee structures,
- invoices,
- payments,
- discounts,
- scholarships,
- refunds,
- receipts.

Payment statuses:

- unpaid,
- partially_paid,
- paid,
- overdue,
- waived,
- refunded.

---

# 51. CMS

Admin should control public website content.

CMS-managed items:

- homepage hero,
- homepage statistics,
- about,
- mission,
- vision,
- leadership,
- teachers,
- programs,
- courses,
- notices,
- events,
- blog,
- FAQ,
- testimonials,
- contact details,
- social links,
- footer.

---

# 52. Blog and Resources

Blog fields:

- title,
- slug,
- cover,
- excerpt,
- content,
- author,
- categories,
- tags,
- publishedAt,
- SEO metadata.

Resources may contain:

- documents,
- videos,
- learning guides,
- public lesson content.

---

# 53. Search

Global search.

Student searchable entities:

- courses,
- lessons,
- materials,
- announcements.

Teacher searchable entities:

- students,
- courses,
- lessons,
- assignments,
- questions.

Admin searchable entities:

- users,
- students,
- teachers,
- courses,
- batches,
- payments,
- certificates,
- applications.

Search should support filters.

---

# 54. Analytics

## 54.1 Student Analytics

- course completion,
- assessment score,
- attendance,
- activity,
- pending work,
- learning streak,
- subject performance.

## 54.2 Teacher Analytics

- class attendance,
- assignment completion,
- average quiz result,
- student progress,
- struggling students,
- ungraded work.

## 54.3 Admin Analytics

- student growth,
- course enrollment,
- active students,
- course completion,
- attendance rate,
- assessment performance,
- teacher activity,
- certificates issued,
- application conversion,
- revenue if enabled.

---

# 55. Reports

Reports should support date filters and exports.

Possible reports:

- enrollment,
- attendance,
- grades,
- exam results,
- assignment completion,
- teacher workload,
- course completion,
- certificate issuance,
- finance,
- admissions.

Export formats:

- CSV
- XLSX later
- PDF later

---

# 56. Audit Logging

Sensitive actions must be logged.

Examples:

- user created,
- user deleted,
- role changed,
- grade modified,
- exam changed,
- result published,
- payment changed,
- certificate revoked,
- settings changed,
- permissions changed.

Audit log fields:

- actor,
- action,
- resource type,
- resource ID,
- previous value,
- new value,
- timestamp,
- IP metadata where appropriate,
- user agent where appropriate.

Audit logs should not be editable through normal admin UI.

---

# 57. Multilingual Support

Target languages:

- English
- Bangla
- Arabic

Architecture must support i18n from the beginning.

Requirements:

- translation keys,
- language selector,
- saved language preference,
- locale-aware date formatting,
- locale-aware number formatting,
- proper Arabic RTL.

Do not implement Arabic by merely translating text.

Layout must support direction switching.

---

# 58. Accessibility

Target WCAG 2.1 AA where practical.

Requirements:

- keyboard navigation,
- semantic HTML,
- accessible labels,
- focus indicators,
- sufficient contrast,
- responsive text,
- screen reader support,
- reduced-motion consideration,
- no color-only status indicators.

---

# 59. Responsive UI

Student:
- mobile-first.

Teacher:
- tablet/laptop-first.

Admin:
- desktop-first with mobile fallback.

Core breakpoints should be consistent.

---

# 60. Design System

Use:

- Tailwind CSS
- shadcn/ui
- consistent tokens.

Tokens:

- colors,
- typography,
- spacing,
- radii,
- shadows,
- borders,
- layout widths,
- breakpoints,
- motion.

Components:

- button,
- input,
- textarea,
- select,
- checkbox,
- radio,
- date picker,
- dialog,
- drawer,
- table,
- card,
- tabs,
- badge,
- tooltip,
- dropdown,
- command palette,
- pagination,
- toast,
- skeleton,
- empty state,
- error state,
- loading state.

---

# 61. UI Style

The product should feel:

- modern,
- clean,
- friendly,
- professional,
- academic,
- accessible,
- trustworthy.

Avoid:

- excessive gradients,
- unnecessary glassmorphism,
- random animations,
- oversized empty sections,
- inconsistent spacing,
- AI-generated-looking UI,
- excessive iconography.

Motion should be subtle and functional.

---

# 62. Recommended Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Zustand
- Recharts
- TipTap

## Backend

- Node.js
- Express.js
- TypeScript
- Firebase Admin SDK
- Mongoose
- Zod
- REST API

## Database

- MongoDB Atlas

## Authentication

- Firebase Authentication

## Storage

Recommended:
- Cloudflare R2 for general file storage
- Cloudinary for image transformation where useful

Alternative:
- Firebase Storage

## Email

- Resend

## Monitoring

- Sentry

## Deployment

- Vercel for frontend
- Render / Railway / Fly.io / equivalent managed Node hosting for backend

## CI/CD

- GitHub Actions

---

# 63. Why Next.js

Use Next.js because ETA includes both:

- public SEO pages,
- authenticated application dashboards.

Benefits:

- server rendering,
- metadata,
- SEO,
- routing,
- layouts,
- image optimization,
- API compatibility,
- performance.

---

# 64. Backend Architecture

Recommended modular structure:

```text
src/
├── app.ts
├── server.ts
├── config/
├── middleware/
├── common/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── teachers/
│   ├── guardians/
│   ├── programs/
│   ├── courses/
│   ├── batches/
│   ├── enrollments/
│   ├── lessons/
│   ├── materials/
│   ├── classes/
│   ├── attendance/
│   ├── assignments/
│   ├── questions/
│   ├── quizzes/
│   ├── exams/
│   ├── grades/
│   ├── certificates/
│   ├── announcements/
│   ├── notifications/
│   ├── messaging/
│   ├── admissions/
│   ├── finance/
│   ├── cms/
│   ├── analytics/
│   ├── audit/
│   └── settings/
└── tests/
```

Each module should contain:

```text
controller
service
repository/model
route
validation
types
permissions
tests
```

---

# 65. API Versioning

Base:

```text
/api/v1
```

Main routes:

```text
/api/v1/auth
/api/v1/users
/api/v1/students
/api/v1/teachers
/api/v1/guardians
/api/v1/programs
/api/v1/courses
/api/v1/batches
/api/v1/enrollments
/api/v1/modules
/api/v1/lessons
/api/v1/materials
/api/v1/classes
/api/v1/attendance
/api/v1/assignments
/api/v1/submissions
/api/v1/questions
/api/v1/quizzes
/api/v1/quiz-attempts
/api/v1/exams
/api/v1/exam-attempts
/api/v1/grades
/api/v1/results
/api/v1/certificates
/api/v1/announcements
/api/v1/notifications
/api/v1/messages
/api/v1/applications
/api/v1/payments
/api/v1/invoices
/api/v1/reports
/api/v1/analytics
/api/v1/cms
/api/v1/audit
/api/v1/settings
```

---

# 66. API Response Standard

Success:

```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": []
}
```

---

# 67. Pagination

Standard query:

```text
?page=1&limit=20&sort=-createdAt
```

Response meta:

```json
{
  "page": 1,
  "limit": 20,
  "total": 240,
  "pages": 12
}
```

---

# 68. Database Collections

Core collections:

```text
users
studentProfiles
teacherProfiles
guardianProfiles

programs
courses
subjects
batches
enrollments

modules
lessons
materials

classSessions
attendanceRecords

assignments
submissions

questions
quizzes
quizAttempts

exams
examAttempts

gradebooks
grades
results

guardianLinks

announcements
notifications
conversations
messages

applications

payments
invoices
discounts
scholarships

certificates

cmsPages
blogs
events
faqs
testimonials

auditLogs
systemSettings
```

---

# 69. Database Design Rules

1. Avoid giant embedded arrays.
2. Avoid storing all students inside a course document.
3. Avoid storing all attempts inside an exam document.
4. Use separate collections for high-growth records.
5. Use references for major entities.
6. Embed only small stable data.
7. Add indexes for frequent queries.
8. Add timestamps.
9. Use soft delete for important academic records where appropriate.
10. Use immutable IDs.

---

# 70. Recommended Indexes

Examples:

```text
users.firebaseUid unique
users.email unique

courses.slug unique
courses.programId

batches.courseId
batches.status

enrollments.studentId + batchId unique

lessons.moduleId + sequence

classSessions.batchId + startTime

attendanceRecords.classSessionId + studentId unique

submissions.assignmentId + studentId

quizAttempts.quizId + studentId

examAttempts.examId + studentId

notifications.userId + read + createdAt

certificates.certificateId unique

applications.email + programId
```

---

# 71. File Storage Rules

Do not store large file binaries in MongoDB.

Store file metadata only.

Example:

```json
{
  "title": "Lesson 4 PDF",
  "url": "https://storage.example/file.pdf",
  "storageKey": "lessons/...",
  "type": "pdf",
  "size": 483920,
  "mimeType": "application/pdf",
  "uploadedBy": "user-id"
}
```

---

# 72. File Upload Security

Validate:

- MIME type,
- extension,
- max file size,
- authorization,
- storage path.

Use signed upload URLs where appropriate.

Do not trust browser-provided MIME metadata.

---

# 73. Security Requirements

Mandatory:

- Firebase token verification,
- backend authorization,
- RBAC,
- request validation,
- rate limiting,
- CORS configuration,
- security headers,
- XSS protection,
- injection prevention,
- sanitized rich text,
- safe file uploads,
- secret management,
- audit logging,
- database backup,
- strong password requirements through Firebase,
- session/token expiration handling.

---

# 74. Environment Variables

Examples:

```text
NODE_ENV
PORT

MONGODB_URI

FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID

R2_ACCOUNT_ID
R2_ACCESS_KEY
R2_SECRET_KEY
R2_BUCKET

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

RESEND_API_KEY

SENTRY_DSN

FRONTEND_URL
BACKEND_URL
```

Never commit `.env` files.

Provide `.env.example`.

---

# 75. PWA

Future-ready requirements:

- installable,
- app manifest,
- service worker,
- offline shell,
- push notification support,
- app icons,
- theme metadata.

Offline assessment submission is not required initially.

---

# 76. SEO

Public pages require:

- metadata,
- canonical URLs,
- Open Graph,
- sitemap,
- robots.txt,
- structured data where suitable,
- clean slugs,
- optimized images.

Private dashboard routes should not be indexed.

---

# 77. Performance Requirements

Targets:

- good Core Web Vitals,
- lazy load heavy components,
- paginated data,
- compressed images,
- optimized queries,
- caching where appropriate,
- skeleton UI,
- avoid unnecessary frontend state,
- avoid loading entire datasets.

---

# 78. Error Handling

Every feature should have:

- loading state,
- empty state,
- permission denied state,
- validation errors,
- network error,
- retry option where safe,
- 404,
- 500 fallback.

---

# 79. Logging

Backend logs:

- request ID,
- error,
- route,
- user ID when available,
- timestamp.

Never log:

- passwords,
- auth tokens,
- private keys,
- sensitive document contents.

---

# 80. Testing Strategy

## Unit Tests

Examples:

- grade calculation,
- permission checks,
- enrollment rules,
- certificate eligibility,
- attendance percentage.

## Integration Tests

Examples:

- create course,
- submit assignment,
- create quiz attempt,
- publish result.

## End-to-End Tests

Critical flows:

1. Register/login.
2. Admin creates course.
3. Admin creates batch.
4. Student enrollment.
5. Teacher publishes lesson.
6. Student opens lesson.
7. Teacher creates assignment.
8. Student submits.
9. Teacher grades.
10. Teacher creates quiz.
11. Student takes quiz.
12. Teacher marks attendance.
13. Student sees result.
14. Guardian sees linked progress.

Recommended:
- Vitest/Jest
- Supertest
- Playwright

---

# 81. Git Strategy

Suggested branches:

```text
main
develop
feature/*
fix/*
chore/*
release/*
```

Production deploy from `main`.

Use Pull Requests.

---

# 82. Commit Convention

Examples:

```text
feat(auth): add firebase login
feat(course): add course creation
fix(exam): prevent duplicate attempt
refactor(api): standardize responses
chore(ci): add github actions
docs(prd): update exam requirements
```

---

# 83. Monorepo Structure

Recommended:

```text
eta-platform/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── utils/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   └── RBAC.md
│
├── .github/
│   └── workflows/
│
├── package.json
├── README.md
└── .env.example
```

Potential tooling:

- pnpm workspaces
- Turborepo

---

# 84. Development Environments

Environments:

- local
- development
- staging
- production

Each environment must use isolated secrets and databases.

Do not use production DB during development.

---

# 85. CI/CD

GitHub Actions should run:

```text
install
lint
type-check
test
build
```

Production deployment only after successful checks.

---

# 86. Deployment Architecture

```text
Browser
   ↓
Vercel
   ↓
Next.js frontend
   ↓
HTTPS REST API
   ↓
Managed Node backend
   ↓
MongoDB Atlas

External:
Firebase Auth
R2 / Cloudinary
Resend
Sentry
```

---

# 87. Backup Strategy

MongoDB:

- scheduled backups,
- point-in-time recovery where plan allows.

Storage:

- durable object storage,
- lifecycle policy.

Critical exports:
- periodic academic record export.

---

# 88. Privacy

Only expose data required for the user's role.

Examples:

Student:
- cannot browse private profiles of unrelated students.

Guardian:
- can only view explicitly linked children.

Teacher:
- can only view students under permitted courses/batches unless extra permission granted.

Admin:
- scoped permissions where possible.

---

# 89. Data Retention

Define later by policy, but architecture should allow:

- soft delete,
- archive,
- anonymization,
- retention periods,
- restoration.

Never hard-delete critical academic data by default.

---

# 90. V1 Scope

V1 must include:

## Public

- homepage,
- about,
- programs,
- courses,
- notices,
- contact,
- authentication.

## Authentication

- Firebase email/password,
- Google login,
- verification,
- password reset.

## User Management

- students,
- teachers,
- admins,
- roles,
- permissions.

## Academics

- programs,
- courses,
- batches,
- enrollment,
- modules,
- lessons,
- materials.

## Classes

- scheduling,
- meeting links,
- recordings,
- class materials.

## Assessment

- assignments,
- submissions,
- question bank,
- quizzes,
- basic exams,
- grading,
- results.

## Attendance

- manual attendance,
- attendance reports.

## Dashboards

- student,
- teacher,
- admin.

## Communication

- announcements,
- in-app notifications.

## Profile

- user profile,
- preferences.

---

# 91. Phase 2 Scope

- guardian dashboard,
- guardian linking,
- messaging,
- certificates,
- calendar improvements,
- admissions,
- CMS improvements,
- exports,
- advanced analytics.

---

# 92. Phase 3 Scope

- finance,
- payments,
- scholarship,
- PWA,
- push notifications,
- Google Calendar,
- Zoom/Meet integration,
- multilingual completion,
- advanced reporting.

---

# 93. Phase 4 Scope

AI features:

- AI study assistant,
- lesson Q&A,
- lesson summary,
- question generation,
- assignment feedback assistant,
- teacher content assistant,
- semantic course search,
- weak-topic detection,
- personalized study plan.

AI responses should be grounded in ETA materials where appropriate.

---

# 94. AI Study Assistant Future Design

Potential feature:

```text
Ask ETA
```

Student asks a question.

System retrieves relevant ETA learning materials.

Answer includes:

- explanation,
- lesson reference,
- source material,
- optional follow-up questions.

Requirements:

- source grounding,
- citations,
- permission-aware retrieval,
- no access to another user's private data.

---

# 95. Milestone Plan

## Phase 0 — Foundation

Deliverables:

- monorepo,
- frontend setup,
- backend setup,
- linting,
- formatting,
- TypeScript,
- Tailwind,
- shadcn,
- database connection,
- Firebase setup,
- CI,
- environment strategy,
- architecture docs.

Acceptance:

- both apps run,
- CI passes,
- production-like environment exists.

---

## Phase 1 — Auth and Identity

Deliverables:

- register,
- login,
- Google sign-in,
- password reset,
- email verification,
- user sync to MongoDB,
- protected routes,
- role switching,
- RBAC middleware.

Acceptance:

- users can authenticate,
- unauthorized API requests fail,
- role restrictions work.

---

## Phase 2 — Core Academic Models

Deliverables:

- programs,
- courses,
- batches,
- enrollments,
- subjects,
- modules.

Acceptance:

- admin can create academic structure,
- teacher assignment works,
- student enrollment works.

---

## Phase 3 — Learning Content

Deliverables:

- lessons,
- materials,
- uploads,
- progress,
- course detail pages.

Acceptance:

- teacher publishes lesson,
- student accesses lesson,
- completion can be tracked.

---

## Phase 4 — Class Scheduling

Deliverables:

- class creation,
- schedule,
- meeting link,
- student class list,
- recording link.

Acceptance:

- teacher creates class,
- student sees upcoming class,
- completed class shows recording.

---

## Phase 5 — Assignment

Deliverables:

- assignment creation,
- submission,
- grading,
- feedback.

Acceptance:

- full teacher-student assignment workflow works.

---

## Phase 6 — Quiz

Deliverables:

- question bank,
- quiz builder,
- attempts,
- timer,
- auto grading.

Acceptance:

- student takes quiz,
- score calculates,
- result release follows configured policy.

---

## Phase 7 — Exams and Gradebook

Deliverables:

- exam builder,
- exam attempt,
- autosave,
- timer,
- grading,
- gradebook,
- results.

Acceptance:

- exam can run reliably,
- grades aggregate correctly.

---

## Phase 8 — Attendance

Deliverables:

- class attendance,
- attendance history,
- attendance analytics.

Acceptance:

- teacher marks attendance,
- student sees accurate attendance.

---

## Phase 9 — Communication

Deliverables:

- announcements,
- notifications,
- email notifications.

Acceptance:

- targeted announcements work.

---

## Phase 10 — Guardian

Deliverables:

- guardian linking,
- guardian dashboard,
- child progress.

Acceptance:

- guardian can only access linked children.

---

## Phase 11 — Certificates

Deliverables:

- eligibility,
- certificate generation,
- verification.

Acceptance:

- eligible student gets verifiable certificate.

---

## Phase 12 — CMS and Public Content

Deliverables:

- homepage editor,
- notices,
- events,
- blog,
- FAQ,
- testimonials.

Acceptance:

- public content changes without code deployment.

---

## Phase 13 — Analytics

Deliverables:

- student analytics,
- teacher analytics,
- admin analytics,
- exports.

---

## Phase 14 — Finance

Deliverables:

- fees,
- invoices,
- payments,
- discounts,
- scholarships.

---

# 96. Definition of Done

A feature is complete when:

1. Requirements implemented.
2. Backend authorization implemented.
3. Validation implemented.
4. Loading state exists.
5. Empty state exists.
6. Error state exists.
7. Responsive UI works.
8. Accessibility basics addressed.
9. Tests added.
10. Type check passes.
11. Lint passes.
12. Build passes.
13. API documented.
14. Database changes documented.
15. Security reviewed.
16. Acceptance criteria pass.

---

# 97. AI Development Rules

When using AI coding agents such as Codex, ChatGPT, Claude, Cursor, or similar, the agent must follow these rules.

## 97.1 Before Coding

AI must:

1. Read this PRD.
2. Read architecture docs.
3. Read database schema docs.
4. Inspect existing code.
5. Avoid duplicating existing functionality.
6. State affected modules.
7. Identify migrations or breaking changes.

## 97.2 During Coding

AI must:

- preserve current features,
- use TypeScript,
- follow existing architecture,
- avoid hard-coded permission checks,
- validate server input,
- enforce authorization server-side,
- create reusable components,
- avoid giant files,
- avoid unnecessary dependencies,
- use clear naming,
- add comments only where useful,
- preserve accessibility,
- preserve responsiveness.

## 97.3 AI Must Not

- rewrite the full application unnecessarily,
- introduce a second auth system,
- store passwords in MongoDB,
- trust frontend roles,
- commit secrets,
- store large files in MongoDB,
- hard-code course IDs,
- hard-code grades,
- hard-code teacher/student permissions,
- bypass tests,
- remove working functionality without explicit reason.

## 97.4 After Coding

AI must provide:

- implementation summary,
- files changed,
- schema changes,
- API changes,
- test result,
- build result,
- known limitations,
- next recommended task.

---

# 98. Feature Task Template for AI

Every AI development request can use:

```text
Feature:
[feature name]

PRD Reference:
[section]

Goal:
[goal]

User Roles:
[roles]

Functional Requirements:
[list]

Routes:
[list]

API:
[list]

Database:
[list]

Permissions:
[list]

UI States:
- loading
- empty
- success
- error
- unauthorized

Acceptance Criteria:
[list]

Tests:
[list]

Constraints:
- TypeScript
- existing design system
- backend authorization
- no regressions
```

---

# 99. Example AI Prompt — Start Project

```text
You are the senior full-stack engineer for Exploratory Training Academy (ETA).

Read PRD.md completely before making changes.

Create the initial monorepo architecture described in the PRD.

Stack:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Node.js
- Express
- TypeScript
- MongoDB/Mongoose
- Firebase Authentication
- Zod
- React Hook Form
- TanStack Query
- Zustand
- pnpm workspaces
- Turborepo

Requirements:
1. Create apps/web and apps/api.
2. Create shared packages for types, validation, config, UI, and utils.
3. Set up linting and formatting.
4. Set up environment validation.
5. Add MongoDB connection.
6. Add Firebase Admin initialization.
7. Create basic health API.
8. Create public landing route.
9. Create dashboard route placeholders.
10. Add GitHub Actions for lint, type-check, test, and build.
11. Create .env.example.
12. Create README setup instructions.
13. Do not implement feature modules yet.
14. Ensure both apps build successfully.

After implementation:
- explain architecture,
- list changed files,
- show run commands,
- show test/build results,
- identify next recommended PRD phase.
```

---

# 100. Example AI Prompt — Implement Feature

```text
You are working on the Exploratory Training Academy platform.

Read PRD.md first.

Implement the [FEATURE NAME] feature according to the PRD.

Do not rewrite unrelated working code.

Before coding:
1. inspect the current implementation,
2. identify reusable services/components,
3. verify database relationships,
4. verify RBAC requirements.

Implementation must include:
- backend model,
- validation,
- service,
- controller,
- routes,
- authorization,
- frontend API service,
- React UI,
- loading state,
- empty state,
- error state,
- responsive design,
- tests,
- documentation.

Use:
- TypeScript,
- Zod,
- MongoDB/Mongoose,
- TanStack Query,
- React Hook Form where appropriate,
- existing shadcn components.

After implementation:
1. run lint,
2. run type-check,
3. run tests,
4. run build,
5. fix all failures,
6. provide summary,
7. list files changed,
8. list API changes,
9. list schema changes,
10. state known limitations.
```

---

# 101. Recommended Documentation Files

As development starts, create:

```text
docs/
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── RBAC.md
├── DESIGN_SYSTEM.md
├── TESTING.md
├── DEPLOYMENT.md
└── CHANGELOG.md
```

This PRD is the product source of truth.

Architecture-specific decisions should live in ARCHITECTURE.md.

Database details should live in DATABASE.md.

---

# 102. Critical Architecture Decisions

1. Firebase handles identity.
2. MongoDB handles ETA application data.
3. Backend handles authorization.
4. Roles use granular permissions.
5. Public site and authenticated app share one frontend.
6. Backend remains reusable by future apps.
7. Files live in object storage.
8. Academic records use normalized collections.
9. Assessments are separate entities.
10. Audit sensitive operations.
11. Multilingual support starts at architecture level.
12. AI remains an optional layer, not the core architecture.

---

# 103. V1 Launch Checklist

## Infrastructure

- [ ] production frontend
- [ ] production backend
- [ ] production DB
- [ ] Firebase configured
- [ ] file storage configured
- [ ] domain configured
- [ ] HTTPS
- [ ] monitoring
- [ ] backups

## Authentication

- [ ] registration
- [ ] login
- [ ] Google auth
- [ ] password reset
- [ ] verification
- [ ] protected routes

## Security

- [ ] RBAC
- [ ] input validation
- [ ] rate limiting
- [ ] CORS
- [ ] security headers
- [ ] file validation
- [ ] audit log
- [ ] secrets protected

## Academic

- [ ] programs
- [ ] courses
- [ ] batches
- [ ] enrollment
- [ ] modules
- [ ] lessons
- [ ] materials
- [ ] classes
- [ ] attendance

## Assessments

- [ ] assignments
- [ ] submissions
- [ ] quizzes
- [ ] question bank
- [ ] exams
- [ ] gradebook
- [ ] results

## Dashboards

- [ ] student
- [ ] teacher
- [ ] admin

## Communication

- [ ] announcements
- [ ] notifications

## Quality

- [ ] responsive
- [ ] accessibility basics
- [ ] lint
- [ ] type-check
- [ ] tests
- [ ] production build
- [ ] error monitoring
- [ ] backup verification

---

# 104. V1 Acceptance Scenario

A successful ETA V1 should support this full journey:

1. Admin logs in.
2. Admin creates a program.
3. Admin creates a course.
4. Admin creates a batch.
5. Admin assigns a teacher.
6. Student registers.
7. Student is enrolled.
8. Teacher creates a module.
9. Teacher creates a lesson.
10. Teacher uploads a material.
11. Teacher schedules a class.
12. Student sees class.
13. Student attends.
14. Teacher marks attendance.
15. Teacher publishes assignment.
16. Student submits.
17. Teacher grades.
18. Teacher creates quiz.
19. Student completes quiz.
20. Teacher creates exam.
21. Student sits exam.
22. Results are calculated.
23. Student sees grade and attendance.
24. Admin can monitor overall progress.
25. All sensitive actions respect permissions.

If this journey works reliably, V1 is operationally useful.

---

# 105. Final Development Guidance

Build ETA as an academic platform, not as a group of dashboards.

The core domain model must remain coherent:

```text
User
  ↓
Role / Permission

Student
  ↓
Enrollment
  ↓
Batch
  ↓
Course
  ↓
Subject
  ↓
Module
  ↓
Lesson

Lesson
  ├── Material
  ├── Class
  ├── Assignment
  ├── Quiz
  └── Exam

Student
  ├── Attendance
  ├── Submission
  ├── Quiz Attempt
  ├── Exam Attempt
  ├── Grade
  ├── Progress
  └── Certificate
```

Do not start by building every page.

Start with:

1. architecture,
2. authentication,
3. permissions,
4. core academic data model,
5. learning flow,
6. assessment,
7. attendance,
8. communication,
9. guardian,
10. certificates,
11. analytics,
12. finance,
13. AI.

The first priority should always be reliable academic workflows, security, and maintainability.

---

# 106. Product Success Criteria

ETA will be considered successful when:

- students can complete their entire academic workflow without external tools for core functions,
- teachers can run classes and assessments efficiently,
- guardians can clearly understand student progress,
- admins can operate the academy from one system,
- academic records are reliable,
- role permissions prevent unauthorized access,
- the system can scale without structural rewrites,
- new programs and batches can be created without developer involvement,
- public content can be updated through CMS,
- the codebase remains understandable to both human and AI developers.

---

# 107. End of PRD

**Document:** Exploratory Training Academy Product Requirements Document  
**Version:** 1.0  
**Recommended Next Step:** Build Phase 0 — Foundation and Architecture, then Phase 1 — Authentication and RBAC.
