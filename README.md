# Off-Records

> A multi-tenant attendance management platform built with Next.js, TypeScript, PostgreSQL, and Prisma.

## 1. Project Overview

**Off-Records** is a web-based attendance management system designed for multiple organizations and workplaces.

The application allows organizations to create workplaces, add employees and managers, manage attendance records, control access through permissions, and export attendance reports.

The project is being developed initially as an **intermediate-level modular monolith** with a structure that can be scaled in the future.

---

## 2. Project Goals

The main goals of Off-Records are:

- Support multiple organizations.
- Allow organizations to create multiple workplaces.
- Allow workplace owners to manage their users and attendance.
- Allow managers to manage attendance.
- Allow employees to view their own attendance.
- Allow special attendance-management access to be granted to any organization user.
- Allow attendance records to be exported.
- Maintain audit logs for important actions.
- Provide a platform-level administrator with complete access.
- Keep the architecture simple enough to understand and maintain.
- Keep the system scalable for future development.

---

# 3. Architecture

Off-Records will initially use a:

## Modular Monolith

We are **not using microservices initially**.

The application will be one Next.js application containing clearly separated modules.

Example:

```text
Next.js Application
│
├── Authentication
├── Organizations
├── Workplaces
├── Users
├── Attendance
├── Permissions
├── Reports
└── Platform Administration
```

The architecture should remain modular so individual modules can be separated into services in the future if the application becomes large enough to justify it.

---

# 4. Technology Stack

## Frontend / Full-stack Framework

- Next.js
- React
- TypeScript

## Styling / UI

- Tailwind CSS
- shadcn/ui

## Database

- PostgreSQL

## ORM

- Prisma

## Validation

- Zod

## Forms

- React Hook Form

## Authentication

- Authentication solution to be finalized during implementation.

---

# 5. Multi-Tenant Architecture

Off-Records is a multi-tenant application.

A tenant is an organization using the platform.

Example:

```text
Platform
│
├── Organization A
│   ├── Workplace A
│   └── Workplace B
│
├── Organization B
│   ├── Workplace A
│   └── Workplace B
│
└── Organization C
```

Data belonging to one organization must never be accessible to another organization through normal application operations.

Every organization-owned resource must be properly scoped and authorized.

---

# 6. User Access Model

There are three primary organization-level roles:

```text
Owner
Manager
Employee
```

There is also one platform-level role:

```text
Platform Admin
```

And there is a special attendance-management permission:

```text
Attendance Editor
```

Attendance Editor is **not a role**.

---

# 7. Platform Admin

The Platform Admin is the supreme administrator of Off-Records.

The Platform Admin has access to the entire platform.

They can:

- View all organizations.
- View all workplaces.
- View all users.
- View all attendance records.
- Manage organizations.
- Manage workplace access.
- Revoke access.
- Manage users.
- View audit logs.
- Perform platform-level administrative operations.

Platform Admin access is above organization-level permissions.

---

# 8. Workplace Owner

The Workplace Owner is the person responsible for managing the workplace/organization.

The owner can:

- Manage workplace settings.
- Add employees.
- Remove employees.
- Add managers.
- Manage users.
- Manage attendance.
- Export attendance records.
- Grant Attendance Editor access.
- Revoke Attendance Editor access.
- Manage relevant workplace permissions.

The owner has the highest normal organization-level access.

---

# 9. Manager

Managers are responsible for operational management.

A manager can generally:

- View employees.
- Manage attendance.
- Edit attendance records.
- Export attendance records.
- View attendance reports.

The exact manager permissions should be implemented through the authorization system rather than scattered throughout the application.

---

# 10. Employee

Employees have limited access.

An employee can:

- View their own attendance.
- View their attendance history.
- View attendance summaries/reports.
- Perform attendance actions such as check-in/check-out if that feature is enabled.

An employee cannot normally manage another employee's attendance.

---

# 11. Attendance Editor

Attendance Editor is a **special permission**, not a role.

The purpose is to allow the workplace owner to give attendance-management capabilities to any suitable user.

For example:

```text
Aditya
Role: Employee
Attendance Editor: Enabled
```

Aditya remains an Employee but can now manage attendance records according to the granted permission.

Another example:

```text
Priya
Role: Manager
Attendance Editor: Enabled
```

The permission can be revoked at any time.

Conceptually:

```text
User
│
├── Base Role
│   ├── Owner
│   ├── Manager
│   └── Employee
│
└── Additional Permissions
    └── Attendance Editor
```

The system should not create a separate `AttendanceEditor` user role.

---

# 12. Example Organization

```text
ABC Company
│
├── Owner
│   └── Rahul
│
├── Managers
│   └── Priya
│
└── Employees
    ├── Aditya
    ├── Rohit
    └── Neha
```

If the owner grants Attendance Editor to Aditya:

```text
Aditya
Role: Employee
Permission: Attendance Editor
```

Aditya can now manage attendance without becoming a Manager.

---

# 13. Attendance

Attendance is one of the core modules.

An attendance record will eventually contain information such as:

```text
Employee
Date
Check-in time
Check-out time
Status
Notes
Created by
Updated by
Created at
Updated at
```

The exact database model will be finalized before implementation.

---

# 14. Attendance Editing

Attendance records may need correction.

Example:

```text
Employee: Aditya
Date: 2026-10-07

Original:
Status: Absent

Updated:
Status: Present
```

Important attendance modifications should be recorded in an audit system.

---

# 15. Audit Logs

The system should record important actions.

Example:

```text
User: Aditya
Action: ATTENDANCE_UPDATED

Employee: Rohit
Date: 2026-10-07

Old:
Absent

New:
Present

Timestamp:
2026-10-07 10:32
```

Audit logs are important for accountability and debugging.

---

# 16. Reports and Exports

Organization users with appropriate permissions should be able to export attendance data.

Initial export formats:

- CSV
- Excel

Future formats may include:

- PDF
- Monthly reports
- Department reports
- Employee reports

---

# 17. Planned Core Modules

The application will be divided into modules:

```text
Authentication
Organizations
Workplaces
Users
Employees
Attendance
Permissions
Reports
Audit Logs
Platform Administration
```

---

# 18. Planned Folder Structure

The current planned structure is:

```text
off-records/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── employees/
│   │   ├── workplaces/
│   │   └── settings/
│   │
│   ├── admin/
│   │   ├── organizations/
│   │   ├── users/
│   │   └── audit-logs/
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── attendance/
│   │   ├── employees/
│   │   └── organizations/
│   │
│   ├── layout.tsx
│   └── page.tsx
│
components/
├── ui/
├── layout/
└── shared/
│
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── db/
│   ├── validations/
│   └── utils/
│
│   prisma/
├── contract.prisma
├── contract.json
├── contract.d.ts
└── db.ts
│
├── types/
│   ├── auth.ts
│   ├── attendance.ts
│   └── organization.ts
│
├── public/
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

The structure can change as the project evolves. We should avoid creating folders simply because they look architecturally impressive.

---

# 19. Database

The primary database is:

**PostgreSQL**

Prisma will be used as the ORM.

Conceptually:

```text
Next.js
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

Prisma will provide:

- Database schema definition.
- Type-safe database queries.
- Database migrations.
- Relationships between models.

---

# 20. Important Database Entities

The initial database will likely contain models such as:

```text
User
Organization
Workplace
Membership
Role / Permission
Attendance
AuditLog
Invitation
```

The exact schema must be designed before implementation.

---

# 21. Security Principles

Security is important because the application contains employee and attendance data.

The application must:

- Authenticate users.
- Authorize every protected operation.
- Scope organization data correctly.
- Prevent cross-organization data access.
- Validate user input.
- Protect sensitive environment variables.
- Record important administrative actions.
- Never trust client-side permissions alone.

Authorization must be enforced on the server.

---

# 22. Development Philosophy

This project is also a learning project.

We will prioritize:

1. Understanding the technology.
2. Understanding why an architectural decision is made.
3. Writing maintainable code.
4. Avoiding unnecessary complexity.
5. Building features incrementally.
6. Learning from implementation mistakes.

We will not over-engineer the first version.

---

# 23. Future Features

Potential future features include:

- Check-in/check-out.
- Leave management.
- Holiday management.
- Shift management.
- Overtime.
- Late arrival tracking.
- Early departure tracking.
- Attendance correction requests.
- Geolocation attendance.
- QR-code attendance.
- Device/IP restrictions.
- Payroll integration.
- PDF reports.
- Scheduled reports.
- Email notifications.
- Additional organization roles.
- Advanced permission management.

These features should not be implemented until the core system is stable.

---

## 24. Current Development Status

### Completed
- Phase 1 repository audit completed: README, source structure, dependencies, Prisma contract, migrations, environment-variable usage, and current implementation reviewed. `Document.md` is not present in the repository.
- Next.js 16.4.6, React 19.3.0, TypeScript, Tailwind CSS 4, and Prisma ORM 8 RC are installed. Next.js and Zod were updated to releases that remediate the reported production advisories.
- Modular monolith architecture selected.
- Read-only connectivity check succeeded against PostgreSQL 18.6 (`off_records`).
- Eight core models are defined in `prisma/contract.prisma`; generated contract artifacts include the current `passwordHash` field.
- Member removal and attendance-editor grant/revoke actions now validate IDs and scope target memberships to the authorized organization. Attendance create/update/delete paths verify the employee membership belongs to the authorized workplace before mutating records.
- Restored the workplace member controls and fixed the existing Prisma 8 list-filter syntax and lint error.
- Session-dependent root and dashboard content is streamed behind Suspense boundaries for Next.js 16 Cache Components.
- `npm run build`, `npm run lint`, `npx tsc --noEmit`, and the focused authentication/action-validation suites pass (six auth tests and eight action-validation tests).
- Phase 1 tenant-access work: employees see only assigned workplaces and their own workplace membership; managers/owners and attendance editors see the roster according to policy. Dashboard workplace totals are scoped to accessible workplaces. Role-policy tests pass.
- Roadmap Phase 2 attendance workflows: employees can check in/out and review their scoped history; managers, owners, and attendance editors can review rosters, add/correct/delete records, with attendance changes audited atomically.

### In Progress
- Phase 3 employee administration: owners can add existing accounts to workplaces, change organization-wide roles, and remove workplace members; role/assignment/removal mutations are authorized and audited transactionally. Invitations are not available yet. Removing a workplace member currently cascades deletion of that member's attendance history.
- Authentication baseline: registration/login, bcrypt password hashing, signed expiring sessions, hardened cookies, logout, and current-user checks are implemented. Sessions are stateless JWTs, so logout clears the current browser cookie but does not revoke a copied token; email verification/recovery and authentication rate limiting are outstanding.

### Not Yet Implemented
- Invitation-based onboarding, non-destructive employee offboarding, and complete employee administration.
- Attendance summaries and reporting filters.
- Audit-log views, reports/exports, and platform administration.
- Email verification, account recovery, authentication rate limiting, session revocation, and remaining production-readiness work.

### Baseline Findings
- The emitted Prisma contract now includes the existing `passwordHash` column. `prisma db verify --schema-only` confirms the live PostgreSQL schema matches it; `prisma migration check --space app` passes for the baseline package. The baseline is not applied.
- The database marker still references the older storage hash (`b1d3785e...`), while the emitted contract is `075434ce...`; full `prisma db verify` reports this marker mismatch. No database writes or schema changes were made. Reconcile/sign the verified baseline before applying future migrations.
- `scripts/migrate-add-password.ts` performs direct SQL DDL and is not a substitute for the Prisma 8 RC contract/migration workflow. Do not use it to modify a database; author and review a migration before applying schema changes.
- For schema changes, edit `prisma/contract.prisma`, run `npm run contract:emit`, then author and review a migration with `npx prisma migration plan --name <slug>` before applying it. The generated baseline supports new databases; it must not be applied to the already-provisioned database.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities. The full audit still reports transitive development-tool advisories in the Prisma Composer/Alchemy dependency tree; resolving all of them currently requires a forced Prisma major-version change, which was not applied.
- Generated Prisma artifacts remain excluded from lint.

### Next Step
Finish invitation-based onboarding and employee administration, then audit and reporting, and platform administration. Preserve attendance history during offboarding only after a safe contract/migration is ready; finish session revocation, recovery, and rate limiting as part of production hardening.

### Prioritized Roadmap
1. Tenant-scoped reads and role authorization — completed for organization/workplace roster visibility and the targeted member/attendance mutations; continue expanding tests as new features land.
2. Attendance — employee check-in/out and history, manager/editor attendance review and correction, audit logging, and validation — completed.
3. Employee administration — onboarding/invitations, workplace assignment, role management, and removal — in progress.
4. Audit and reporting — scoped audit-log views, summaries, filters, and CSV export.
5. Platform and production administration — platform-admin controls, revocable sessions, recovery, rate limiting, and the reviewed Prisma migration workflow.

---

# 25. Development Rule for AI Assistants

Any AI assistant working on this repository should:

1. Read this README before making architectural changes.
2. Preserve the multi-tenant architecture.
3. Do not introduce microservices unless explicitly requested.
4. Do not change PostgreSQL without a clear reason.
5. Do not turn Attendance Editor into a separate role.
6. Preserve the distinction between:
   - Platform Admin
   - Owner
   - Manager
   - Employee
   - Attendance Editor permission
7. Enforce authorization on the server.
8. Avoid unnecessary dependencies.
9. Explain significant architectural changes.
10. Prefer simple, maintainable solutions over unnecessary complexity.

---

# 26. Project Principle

> Build a simple system correctly first. Scale it when the actual requirements demand it.

Off-Records should initially be an understandable, maintainable, production-style modular monolith that can evolve into a larger system in the future.
