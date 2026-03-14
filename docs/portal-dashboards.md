# Nazam Platform — System Architecture & Flow Documentation

> **Version:** 1.0
> **Last Updated:** March 2026
> **Audience:** Stakeholders, Product Team, Client

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Role Architecture](#2-role-architecture)
3. [Vendor System](#3-vendor-system)
4. [Organization System](#4-organization-system)
5. [Property Owner System](#5-property-owner-system)
6. [AMC (Annual Maintenance Contract) System](#6-amc-annual-maintenance-contract-system)
7. [Task Lifecycle](#7-task-lifecycle)
8. [Revenue & Commission System](#8-revenue--commission-system)
9. [System Connectivity Map](#9-system-connectivity-map)
10. [Portal Access Summary](#10-portal-access-summary)

---

## 1. Platform Overview

Nazam is a service marketplace platform connecting **customers** (individuals and building tenants) with **service vendors** through an admin-managed workflow. The platform supports:

- **Web Application** — Customer-facing service booking, admin panel, organization portal, property owner portal
- **Mobile Application** — Vendor-facing task management (accept, start, complete jobs)
- **Backend API** — Node.js + Express.js with MongoDB, AWS S3 for storage, CCAvenue for payments

### Key Portals

| Portal                | URL Path          | Users                                  |
| --------------------- | ----------------- | -------------------------------------- |
| Customer Website      | `/`               | End users booking services             |
| Admin Panel           | `/admin`          | Super admin + staff with permissions   |
| Organization Portal   | `/organization`   | Organizations managing their vendors   |
| Property Owner Portal | `/property-owner` | Building owners managing tenants       |
| Vendor Mobile App     | Native App        | Vendors accepting and completing tasks |

---

## 2. Role Architecture

| Role           | Code | Description               | Access                                   |
| -------------- | ---- | ------------------------- | ---------------------------------------- |
| User           | 1    | End customer / tenant     | Web app — book services, manage orders   |
| Vendor         | 2    | Service provider          | Mobile app — accept tasks, complete work |
| Staff          | 3–10 | Admin team members        | Admin panel — permission-based access    |
| Super Admin    | 11   | Full system access        | Admin panel — unrestricted access        |
| Property Owner | 12   | Building/property manager | Property owner portal                    |
| Organization   | 13   | Vendor aggregator company | Organization portal                      |

**Permission System:** Staff members (roles 3–10) have granular permissions (e.g., `services:read`, `orders:write`, `vendors:delete`). Super Admin bypasses all permission checks.

---

## 3. Vendor System

### 3.1 Three Ways to Create a Vendor

#### Method 1: Self-Registration (Mobile App / Web)

- Vendor registers via `POST /api/auth/register`
- Status: **Pending Approval** (`approved: false`)
- Cannot login until admin approves
- Fields: name, email, password, phone, service, covered city, ID verification

#### Method 2: Admin Creates Vendor

- Admin uses the Add Vendor form in admin panel (`/admin/vendors/add-vendor`)
- Status: **Auto-Approved** (`approved: true`) — can login immediately
- Can optionally assign to an Organization via dropdown
- 3-step form: Basic Info → Work Info → Verification

#### Method 3: Organization Creates Vendor

- Organization creates vendor from their portal (`/organization/vendors`)
- Status: **Auto-Approved** (`approved: true`)
- **Automatically linked** to the creating organization
- Simplified form: first name, last name, email, phone, password

### 3.2 Vendor Profile Fields

| Category     | Fields                                                               |
| ------------ | -------------------------------------------------------------------- |
| Identity     | Type (corporate/individual), name, email, phone, gender              |
| Service      | Primary service, covered city, experience, privilege level           |
| Verification | ID type (Passport/EmiratesID/NationalID), ID number, document upload |
| Banking      | Bank name, branch, account number, IBAN                              |
| Availability | Weekly schedule (day + start/end times), unavailable dates           |
| Organization | Organization link (optional — nullable reference)                    |
| Tax          | VAT registration status, tax collection flag                         |

### 3.3 Vendor Approval Flow

```
Self-Registered Vendor                Admin/Org Created Vendor
        │                                      │
   approved: false                        approved: true
        │                                      │
   Login blocked                          Can login immediately
        │                                      │
   Admin approves ──→ approved: true           │
        │                                      │
   Can now login via mobile app          Active on mobile app
```

### 3.4 Admin Vendor Management (`/admin/vendors`)

- **List View:** All vendors with search, filter by type (corporate/individual), filter by organization
- **Statistics:** Total vendors, current month registrations, individual vs corporate counts
- **Detail View:** Full vendor profile, service assignments, task history
- **Add Vendor:** 3-step form with organization dropdown showing `"Name (X% commission)"`
- **Pre-selection:** Supports `?organizationId=` query param when navigating from organization detail page

---

## 4. Organization System

Organizations are companies that manage a fleet of vendors and earn a commission from their work.

### 4.1 Organization Creation (Admin Only)

Admin creates an organization from `/admin/organizations` with:

| Field        | Required | Description            |
| ------------ | -------- | ---------------------- |
| Name         | Yes      | Organization name      |
| Email        | Yes      | Unique login email     |
| Password     | Yes      | Hashed with bcrypt     |
| Phone        | Yes      | Contact number         |
| City         | No       | Operating city         |
| Commission % | No       | Revenue share (0–100%) |
| Address      | No       | Physical address       |
| Country      | No       | Country                |

On creation, the system generates a login-capable entity with `role: 13`.

### 4.2 Organization Portal (`/organization`)

#### Dashboard

Displays 8 stat cards in real-time:

| Metric             | Description                         |
| ------------------ | ----------------------------------- |
| Total Vendors      | All vendors under this organization |
| Active Vendors     | Approved vendors only               |
| Total Tasks        | All tasks assigned to org's vendors |
| Completed Tasks    | Successfully completed tasks        |
| Total Revenue      | Sum of all revenue transactions     |
| Organization Share | Org's commission earnings           |
| Pending Payments   | Unpaid org share                    |
| Completed Payments | Paid out org share                  |

#### Vendors Page (`/organization/vendors`)

- Table: Name, Email, Phone, Service, Status (Approved/Pending), Date
- Add Vendor button with modal (first name, last name, email, phone, password)
- Vendors created here are auto-approved and auto-linked to the organization
- Pagination (10 per page)

#### Revenue Page (`/organization/revenue`)

- 4 summary cards: Total Revenue, Organization Share, Pending Payments, Completed Payments
- Transactions table: Vendor, Task, Total Amount, Org Share, Vendor Share, Status, Date
- Filter by payment status (All / Pending / Completed)
- All amounts in AED

### 4.3 Admin Organization Management

#### List Page (`/admin/organizations`)

- Table: Name, Email, Phone, Commission %, Status, Created Date, Actions
- Search by name or email
- Create/Edit modal
- Activate/Deactivate toggle

#### Detail Page (`/admin/organizations/[id]`)

- **Header:** Name, email, status badge, activate/deactivate button
- **Info Cards:** Email, Phone, Location, Commission %
- **Dashboard Stats:** Same 8 metrics as org portal (vendor count, tasks, revenue, payments)
- **Tabs:**
  - Overview — full org details
  - Vendors — searchable list with "Add Vendor" link (pre-fills organizationId)

### 4.4 How Organization Reflects in Vendor Creation

When creating a vendor from the admin panel:

1. Step 1 (Basic Info) shows an **"Organization (Optional)"** dropdown
2. Lists all organizations as: `"Organization Name (X% commission)"`
3. Default option: **"No Organization (Independent)"**
4. If an organization is selected, `vendor.organizationId` is set
5. Revenue splits will automatically include the org's commission

---

## 5. Property Owner System

Property owners are building managers who onboard their tenants via referral codes and track service usage across their properties.

### 5.1 Property Owner Creation (Admin Only)

Admin creates a property owner with: **Name, Email, Password, Phone, Commission %**

Then admin creates:

- **Properties** (buildings): name, address, city, type (residential/commercial/mixed)
- **Units** (flats/shops): unit number, type (flat/shop/office), floor — with unique constraint per property

### 5.2 Referral Code Flow (Tenant Linking)

This is the core mechanism connecting building tenants to their property:

```
Step 1: Property owner generates a referral code
        ├── Selects a property (required)
        ├── Optionally selects a specific unit
        ├── Sets expiry (default: 7 days)
        └── Sets max uses (default: 1)
        → System generates unique 8-character hex code (e.g., "A1B2C3D4")

Step 2: Owner shares the code with tenant
        (via SMS, email, in-person, etc.)

Step 3: Tenant redeems the code in the app
        POST /api/referral-codes/redeem { code: "A1B2C3D4" }
        → System validates: not expired, not maxed out, active
        → Links user to property: user.propertyId = property
        → If unit specified: links tenant to unit, marks unit as occupied
        → Records usage (who, when)

Step 4: Owner can now track tenant activity
        ├── See tenant in their properties/units list
        ├── View tenant's service requests
        ├── Create service requests on behalf of tenant
        └── Track revenue from tenant-related work
```

**Validation Rules:**

- User cannot redeem if already linked to a property
- Code must be active, not expired, and not at max uses
- Code is case-insensitive (auto-uppercased)

### 5.3 Property Owner Portal (`/property-owner`)

#### Dashboard

9 stat cards:

| Metric             | Description                  |
| ------------------ | ---------------------------- |
| Total Properties   | Number of buildings owned    |
| Total Units        | All units across properties  |
| Occupied Units     | Units with linked tenants    |
| Vacant Units       | Units without tenants        |
| Total Tenants      | All linked tenants           |
| Service Requests   | Total requests from tenants  |
| Pending Requests   | Open/in-progress requests    |
| Completed Requests | Finished requests            |
| AMC Contracts      | Active maintenance contracts |

Plus: Recent service requests table and properties grid.

#### Properties Page (`/property-owner/properties`)

- List of all owned properties with type badges
- Expandable rows showing units with: Unit #, Type, Floor, Status, Tenant Name
- Pagination (12 per page)

#### Referral Codes Page (`/property-owner/referral-codes`)

- **Generate Code:** Modal with property dropdown, unit dropdown (optional), expiry days, max uses
- **Codes Table:** Code (with copy button), Property, Unit, Expires, Max Uses/Used, Status
- **Status Badges:** Valid (green), Expired (red), Inactive (red)
- **Expandable Usage:** Shows who used the code (name, email, date)
- **Deactivate:** Instantly invalidate a code

#### Service Requests Page (`/property-owner/service-requests`)

- View all tenant service requests across properties
- Filter by status or property
- **Create on behalf:** Modal to create a service request for a tenant
  - Select tenant, optionally select unit
  - Enter service name, description, price, date
  - Recorded with `createdByPropertyOwner` reference

#### Revenue Page (`/property-owner/revenue`)

- 4 summary cards: Total Revenue, Owner Share, Pending Payments, Completed Payments
- Transactions table with vendor name, task, amounts, status, date

---

## 6. AMC (Annual Maintenance Contract) System

AMC contracts are long-term service agreements, typically for buildings or commercial clients.

### 6.1 AMC Submission Flow

```
Customer/Admin submits AMC request
    ├── Company info (name, contact, email, address)
    ├── Cart of services (platform services + custom services)
    │   ├── Each item can have: numberOfTimes, scheduledDates
    │   ├── Duration type, number of persons
    │   └── Selected sub-services, questionnaire answers
    └── Creates:
        ├── AMCContract (status: Pending, auto-generated contract number)
        └── Individual ServiceRequest per cart item (type: Quotation)

Admin reviews and manages:
    ├── Sets totalContractValue (after negotiation)
    ├── Updates status: Draft → Pending → Active → Completed
    ├── Creates milestones for phased payments
    ├── Sends payment links (full amount or per milestone)
    └── Assigns vendors via Task creation
```

### 6.2 Contract Number Format

Auto-generated: `AMC-YYYYMMDD-XXXX` (e.g., `AMC-20260312-0001`)

### 6.3 AMC + Property Link

AMC contracts have `propertyId` and `unitId` fields, connecting them to the property owner's buildings. This allows property owners to see AMC activity for their properties.

### 6.4 AMC Admin Management (`/admin/orders/amc/[contractId]`)

- View/edit contract details: dates, value, admin notes
- Manage individual service requests within the contract
- Upload assets and link services
- Set quotation prices per service request
- Milestone management modal
- Payment link generation
- Status lifecycle management

---

## 7. Task Lifecycle

Tasks are the operational unit connecting service requests to vendors.

### 7.1 Task Flow

```
Admin Creates Task
    ├── Links: service request + vendor
    ├── Sets: title, description, location, date/time, amount
    ├── Optional: isAMC flag, AMC contract link
    └── Status: Created

        │
        ▼
    Vendor Notified (status: Notified)
        │
    ┌───┴───┐
    ▼       ▼
 Accepted  Cancelled (with reason)
    │
    ▼
 InProgress (vendor starts work)
    │
    ▼
 Completed (vendor finishes)
    │
    ▼
 Revenue Transaction Generated
```

### 7.2 Task Properties

| Field           | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| serviceRequest  | The customer's order                                             |
| vendor          | Assigned service provider                                        |
| organization    | Vendor's org (auto-populated)                                    |
| isAMC           | Whether this is an AMC task                                      |
| amcContract     | Linked AMC contract (if applicable)                              |
| property / unit | Building reference (if applicable)                               |
| taskAmount      | Payment amount for this task                                     |
| status          | Created → Notified → Accepted/Cancelled → InProgress → Completed |

### 7.3 AMC Tasks

- AMC tasks are **manually assigned only** by admin (no auto-assignment)
- Set `isAMC: true` when creating the task
- Links to both the service request and the AMC contract

---

## 8. Revenue & Commission System

### 8.1 Revenue Generation Triggers

Revenue transactions are created automatically at three points:

| Trigger            | When It Fires                            | Payment Status |
| ------------------ | ---------------------------------------- | -------------- |
| `payment_received` | Customer pays via CCAvenue payment link  | **Completed**  |
| `task_completion`  | Vendor marks task as completed           | Pending        |
| `status_completed` | Admin marks service request as completed | Pending        |

**Why multiple triggers?** A customer may pay before a vendor is assigned (via admin-sent payment link). The payment trigger ensures revenue is tracked even without a task.

### 8.2 Commission Split Calculation

```
Total Amount (e.g., 1,000 AED)
    │
    ├── Organization Share = totalAmount × org.commissionPercentage%
    │   (e.g., 15% → 150 AED)
    │
    ├── Property Owner Share = totalAmount × owner.commissionPercentage%
    │   (e.g., 10% → 100 AED)
    │
    └── Vendor Share = totalAmount - orgShare - ownerShare
        (e.g., 1,000 - 150 - 100 = 750 AED)
```

**Rules:**

- If vendor has no organization → orgShare = 0
- If service request has no property link → ownerShare = 0
- Vendor share never goes below 0
- Independent vendor with no property = vendor gets 100%

### 8.3 Milestone Payments

For AMC or large contracts, payments can be split into milestones:

- Each milestone payment creates a **separate** revenue transaction
- Duplicate prevention via `{ serviceRequest, source, milestoneId }` compound check
- Each milestone records its name and amount independently

### 8.4 Revenue Visibility

| User               | What They See                                                           |
| ------------------ | ----------------------------------------------------------------------- |
| **Admin**          | All revenue transactions across the platform, with full breakdown       |
| **Organization**   | Revenue from their vendors' tasks (total, org share, pending/completed) |
| **Property Owner** | Revenue from service requests linked to their properties                |
| **Vendor**         | Their earnings visible in the mobile app                                |

### 8.5 Payout Tracking

The system tracks individual payout dates:

- `vendorPaidAt` — when vendor was paid
- `organizationPaidAt` — when org was paid
- `propertyOwnerPaidAt` — when property owner was paid

---

## 9. System Connectivity Map

```
                         ┌─────────────────────┐
                         │     ADMIN PANEL      │
                         │  (Super Admin/Staff) │
                         └──────────┬───────────┘
                Creates & manages everything
           ┌────────────────┼────────────────────┐
           ▼                ▼                    ▼
   ┌───────────────┐ ┌──────────────┐  ┌─────────────────┐
   │ ORGANIZATION  │ │  PROPERTY    │  │     SERVICE      │
   │  (role=13)    │ │ OWNER(role=12│  │   CATALOGUE      │
   │               │ │              │  │                   │
   │ Portal:       │ │ Portal:      │  │ Categories →      │
   │ /organization │ │ /property-   │  │ Services →        │
   │               │ │  owner       │  │ Sub-services      │
   └───────┬───────┘ └──────┬───────┘  └────────┬──────────┘
           │                │                    │
     Creates vendors   Generates referral    Customers browse
     (auto-approved)   codes for tenants     & book services
           │                │                    │
           ▼                ▼                    ▼
   ┌───────────────┐ ┌──────────────┐  ┌─────────────────┐
   │   VENDORS     │ │   TENANTS    │  │ SERVICE REQUEST  │
   │  (role=2)     │ │ (linked via  │  │ (customer order) │
   │               │ │ referral code│  │                   │
   │ Mobile App:   │ │              │  │ Regular / AMC /   │
   │ Accept tasks  │ │ Can book     │  │ On-behalf-of      │
   │ Complete work │ │ services     │  │                   │
   └───────┬───────┘ └──────┬───────┘  └────────┬──────────┘
           │                │                    │
           │         Service requests      Admin assigns
           │         (direct or            vendor to request
           │          on-behalf)                 │
           │                │                    │
           └────────────────┴────────┬───────────┘
                                     ▼
                            ┌─────────────────┐
                            │      TASK        │
                            │                  │
                            │ Links:           │
                            │ • Service Request│
                            │ • Vendor         │
                            │ • Organization   │
                            │ • AMC Contract   │
                            │ • Property/Unit  │
                            └────────┬─────────┘
                                     │
                              On completion
                                     │
                                     ▼
                            ┌─────────────────┐
                            │    REVENUE       │
                            │  TRANSACTION     │
                            │                  │
                            │ Splits:          │
                            │ • Org Share      │
                            │ • Owner Share    │
                            │ • Vendor Share   │
                            └──────────────────┘
```

### Data Flow Example: End-to-End

```
 1. Admin creates Organization "CleanCo" with 15% commission
 2. Admin creates Property Owner "Mr. Ahmed" with 10% commission
 3. Admin creates Property "Sunrise Tower" under Mr. Ahmed
 4. Admin creates 20 units in Sunrise Tower
 5. CleanCo creates Vendor "Ali" from their portal (auto-approved)
 6. Mr. Ahmed generates referral code for Unit A-101
 7. Tenant "Sara" redeems code → linked to Sunrise Tower, Unit A-101
 8. Sara books "AC Cleaning" service (500 AED)
 9. Admin creates Task → assigns to Vendor Ali
10. Ali accepts task via mobile app → starts work → completes
11. Revenue generated:
    • CleanCo (org) gets: 500 × 15% = 75 AED
    • Mr. Ahmed (owner) gets: 500 × 10% = 50 AED
    • Ali (vendor) gets: 500 - 75 - 50 = 375 AED
```

---

## 10. Portal Access Summary

### Organization Portal (`/organization/login`)

| Page          | Features                                          |
| ------------- | ------------------------------------------------- |
| **Dashboard** | 8 stat cards (vendors, tasks, revenue, payments)  |
| **Vendors**   | List vendors, add new vendors, view status        |
| **Revenue**   | Transaction list, filter by status, summary cards |

### Property Owner Portal (`/property-owner/login`)

| Page                 | Features                                                 |
| -------------------- | -------------------------------------------------------- |
| **Dashboard**        | 9 stat cards (properties, units, tenants, requests, AMC) |
| **Properties**       | Expandable list with units and tenant info               |
| **Referral Codes**   | Generate, copy, track usage, deactivate                  |
| **Service Requests** | View tenant requests, create on-behalf-of                |
| **Revenue**          | Transaction list, owner share summary                    |

### Admin Panel (`/admin`)

| Section             | Features                                                |
| ------------------- | ------------------------------------------------------- |
| **Organizations**   | CRUD, dashboard per org, vendor list per org            |
| **Vendors**         | List, add (3-step form), approve, org assignment        |
| **Property Owners** | Create owners, properties, units                        |
| **Orders**          | Service requests, AMC contracts, task management        |
| **Tasks**           | Create, assign vendors, track lifecycle                 |
| **Revenue**         | All transactions, source tracking, commission breakdown |
| **Services**        | CRUD, categories, featured management                   |
| **Staff**           | Role-based access with granular permissions             |

### Vendor Mobile App

| Feature           | Description                         |
| ----------------- | ----------------------------------- |
| **My Tasks**      | View assigned tasks                 |
| **Accept/Cancel** | Respond to task assignments         |
| **Start Work**    | Mark task as in-progress            |
| **Complete**      | Mark task as done, triggers revenue |
| **Profile**       | View/update vendor information      |

---
