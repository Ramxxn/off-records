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
├── components/
│   ├── ui/
│   ├── forms/
│   ├── attendance/
│   ├── employees/
│   └── dashboard/
│
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── db/
│   ├── validations/
│   └── utils/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
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

# 24. Current Development Status

## Completed

- Project name selected: `off-records`
- Next.js project created.
- TypeScript enabled.
- Modular monolith architecture selected.
- PostgreSQL selected.
- Prisma selected.
- Basic role/access model designed.

## In Progress

- PostgreSQL setup.
- Prisma setup.
- Database architecture.

## Not Yet Implemented

- Authentication.
- Organizations.
- Workplaces.
- Employees.
- Managers.
- Permissions.
- Attendance.
- Audit logs.
- Reports.
- Platform administration.

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