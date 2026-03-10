# Nazam Core - System Flows Documentation

## Table of Contents
1. [Roles & Access](#1-roles--access)
2. [Vendor System](#2-vendor-system)
3. [Organization System](#3-organization-system)
4. [Vendor ↔ Organization Link](#4-vendor--organization-link)
5. [Property Owner System](#5-property-owner-system)
6. [Referral Code & Tenant Linking](#6-referral-code--tenant-linking)
7. [Task Lifecycle](#7-task-lifecycle)
8. [Revenue & Commission Flow](#8-revenue--commission-flow)
9. [API Reference Matrix](#9-api-reference-matrix)

---

## 1. Roles & Access

| Role | Code | Description |
|------|------|-------------|
| User (Tenant) | 1 | End user / tenant who books services |
| Vendor | 2 | Service provider who performs tasks |
| Staff / Admin | 3-11 | Platform administrators |
| Property Owner | 12 | Building/property owner managing tenants |
| Organization | 13 | Company managing a group of vendors |

---

## 2. Vendor System

### 2.1 Vendor Model Fields

**Required:** type, firstName, lastName, email, password, coveredCity, serviceId, countryCode, mobileNumber, idType, idNumber

**Optional:** company, gender, experience, profilePic, idDocument, serviceAvailability, availabilitySchedule, unavailableDates, bankName, branchName, bankAccountNumber, iban, personalIdNumber, address, country, city, pinCode, vatRegistration, collectTax, organizationId

**Defaults:** approved=false, role=2, serviceAvailability="Full-time"

### 2.2 Three Ways to Create a Vendor

#### A. Self-Registration (from App)

```
POST /api/auth/register
Access: Public (no auth required)
```

**Flow:**
1. User submits registration form with role=2
2. System validates: unique email, unique mobileNumber, valid serviceId (must be active)
3. Password is hashed automatically
4. Vendor created with `approved: false`
5. JWT token returned immediately (vendor can login but cannot receive tasks until approved)

**Key Point:** Self-registered vendors are **NOT auto-approved**. Admin must approve them before they can be assigned tasks.

#### B. Admin Creates Vendor

```
POST /api/auth/admin/create-vendor
Access: Staff (role 3-11) + vendors:write permission
Content-Type: multipart/form-data (supports file uploads)
```

**Flow:**
1. Admin fills vendor form with all required fields
2. Optionally uploads profilePic and idDocument files
3. Files uploaded to AWS S3:
   - Profile: `vendor-profiles/{userId}/{timestamp}-{filename}`
   - ID Doc: `vendor-id-documents/{userId}/{timestamp}-{filename}`
4. Vendor created with `approved: true` (auto-approved by admin)
5. Optionally linked to an organization via `organizationId`

**Key Point:** Admin-created vendors are **auto-approved** and can immediately receive tasks.

#### C. Organization Creates Vendor

```
POST /api/organizations/vendors
Access: Organization (role 13)
```

**Flow:**
1. Organization logs in and creates vendor
2. System auto-sets `organizationId` to the org's ID
3. Vendor created with `approved: true`
4. Vendor is scoped to that organization

**Key Point:** Org-created vendors are **auto-approved** and automatically linked to the organization.

### 2.3 Vendor Approval

| Created By | Auto-Approved? | Can Receive Tasks? |
|------------|---------------|-------------------|
| Self-registration | ❌ No | Not until admin approves |
| Admin | ✅ Yes | Immediately |
| Organization | ✅ Yes | Immediately |

> **Note:** There is currently no dedicated "approve vendor" endpoint. Approval must be done via admin panel or direct DB update.

### 2.4 Vendor Login (App)

```
POST /api/auth/login
Body: { email, password, role: 2 }
Returns: JWT token + vendor data
```

### 2.5 What Vendor Can Do After Login

- **View profile:** `GET /api/auth/me`
- **Update profile:** `PUT /api/auth/updatedetails`
- **View my tasks:** `GET /api/tasks/my-tasks` (filter by status)
- **Accept task:** `PUT /api/tasks/:taskId/accept`
- **Cancel task:** `PUT /api/tasks/:taskId/cancel`
- **Start task:** `PUT /api/tasks/:taskId/start`
- **Complete task:** `PUT /api/tasks/:taskId/complete`

---

## 3. Organization System

### 3.1 Organization Model Fields

**Required:** name, email, password, phone, commissionPercentage (default 0)

**Optional:** address, city, country, logo

**Defaults:** isActive=true, role=13

### 3.2 Organization Creation (Admin Only)

```
POST /api/organizations
Access: Staff (role 3-11)
```

**Flow:**
1. Admin creates organization with name, email, password, phone
2. Sets commissionPercentage (e.g., 15% — org takes 15% of every completed task)
3. Organization account created, can now login separately

### 3.3 Organization Login

```
POST /api/organizations/login
Access: Public
Body: { email, password }
Returns: JWT token (role=13) + organization data
```

**Checks:** Account must exist and be active (`isActive: true`)

### 3.4 What Organization Can Do

| Action | Endpoint | Description |
|--------|----------|-------------|
| Create vendors | `POST /api/organizations/vendors` | Auto-approved, auto-linked |
| View their vendors | `GET /api/organizations/vendors` | Paginated, scoped to org |
| View dashboard | `GET /api/organizations/dashboard` | Vendors, tasks, revenue stats |
| View own profile | `GET /api/organizations/:id` | Organization details |

### 3.5 Organization Dashboard Stats

- **Vendors:** Total count, active (approved) count
- **Tasks:** Total, completed, current (in-progress)
- **Revenue:** Total revenue, organization share, vendor share, pending payments, completed payments

> Revenue is sourced from `RevenueTransaction` collection — only populated when tasks are completed through the Task system.

---

## 4. Vendor ↔ Organization Link

### 4.1 How the Link Works

```
Vendor.organizationId → references Organization._id
```

- **One-to-Many:** One organization can have many vendors
- **Single Org:** A vendor can only belong to one organization at a time
- **Nullable:** Vendors without an org have `organizationId: null` (independent vendors)

### 4.2 How organizationId is Set

| Scenario | How | Value |
|----------|-----|-------|
| Self-registration | Default | `null` (independent) |
| Admin creates vendor | Explicit | `req.body.organizationId` or `null` |
| Org creates vendor | Automatic | `req.user.id` (org's own ID) |

### 4.3 Scoping

- Organization can **only see their own vendors** (`{ organizationId: orgId }`)
- Organization dashboard only shows **tasks assigned to their vendors**
- Organization revenue only shows **revenue from their vendors' completed tasks**
- Admin can see all vendors and filter by `organizationId`

### 4.4 Visual Flow

```
┌─────────────────────────────────────────┐
│           ORGANIZATION                  │
│  (name, email, commissionPercentage)    │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Vendor A │ │ Vendor B │ │Vendor C │ │
│  │ orgId=X  │ │ orgId=X  │ │orgId=X  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘

┌──────────┐
│ Vendor D │  ← Independent (organizationId: null)
│ orgId=∅  │
└──────────┘
```

---

## 5. Property Owner System

### 5.1 Property Owner Model

**Required:** name, email, password, phone, commissionPercentage (default 0)

**Optional:** address, city, country, profilePic, idType, idNumber

**Defaults:** isActive=true, role=12

### 5.2 Property Owner Creation (Admin Only)

```
POST /api/properties/owners
Access: Staff (role 3-11)
```

### 5.3 Property Owner Login

```
POST /api/properties/owners/login
Access: Public
Body: { email, password }
Returns: JWT token (role=12)
```

### 5.4 Property & Unit Hierarchy

```
PropertyOwner (role=12)
  └── Property (building/complex)
        ├── Unit A-101 (tenant: User1)
        ├── Unit A-102 (vacant)
        ├── Unit A-103 (tenant: User2)
        └── Unit B-201 (tenant: User3)
```

**Property Fields:** name, address, city, country, type (residential/commercial/mixed), owner, totalUnits

**Unit Fields:** property, unitNumber, type (flat/shop/office/other), floor, tenant (User ref), isOccupied

### 5.5 Creating Properties & Units

```
POST /api/properties                          → Create property (admin, requires ownerId)
POST /api/properties/:propertyId/units        → Create single unit (admin)
POST /api/properties/:propertyId/units/bulk   → Bulk create units (admin)
```

### 5.6 Property Owner Dashboard

```
GET /api/properties/owner/dashboard
```

**Returns:**
- Properties owned (list with name, city, type)
- Units summary (total, occupied, vacant)
- Tenants linked via referral codes
- Service requests (total, pending, completed, recent 10)
- AMC contracts count

### 5.7 Service Request on Behalf of Tenant

```
POST /api/properties/owner/service-requests
Body: { tenantId, unitId, ...serviceRequestFields }
```

**Flow:**
1. Owner selects a tenant from their linked units
2. Submits service request on tenant's behalf
3. Request created with `createdByPropertyOwner: ownerId` flag
4. Tracks `propertyId` and `unitId` for reporting

---

## 6. Referral Code & Tenant Linking

### 6.1 Flow Overview

```
Property Owner generates code  →  Shares with tenant  →  Tenant redeems  →  Linked to property/unit
```

### 6.2 Generate Referral Code

```
POST /api/referral-codes
Access: Property Owner (role 12)
Body: { propertyId, unitId?, expiresInDays: 7, maxUses: 1 }
```

- Generates unique alphanumeric code (e.g., `A1B2C3D4`)
- Expires after X days (default 7)
- Can be used max X times (default 1)
- Optionally linked to a specific unit

### 6.3 Tenant Redeems Code

```
POST /api/referral-codes/redeem
Access: User (role 1)
Body: { code: "A1B2C3D4" }
```

**Validation:**
- Code must exist, be active, not expired, not max-used
- User must NOT already be linked to a property

**On Success:**
- User.propertyId = referralCode.property
- User.referralCode = code
- If unit specified: User assigned to unit, Unit.tenant = userId, Unit.isOccupied = true
- Code usage tracked (usedCount++, usedBy array)

### 6.4 Manage Codes

```
GET /api/referral-codes                    → List all codes (with validity status)
PUT /api/referral-codes/:id/deactivate     → Deactivate a code
```

---

## 7. Task Lifecycle

### 7.1 Status Flow

```
                    ┌──────────┐
                    │ Created  │  ← Admin creates task
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ Notified │  ← Vendor notified
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         ┌────▼─────┐         ┌────▼─────┐
         │ Accepted │         │Cancelled │  ← Vendor declines
         └────┬─────┘         └──────────┘    (SR reverts to Pending)
              │
         ┌────▼──────┐
         │InProgress │  ← Vendor starts work
         └────┬──────┘
              │
         ┌────▼──────┐
         │ Completed │  ← Vendor finishes
         └───────────┘    (Revenue transaction generated)
```

### 7.2 Task Creation (Admin)

```
POST /api/tasks
Body: { serviceRequestId, vendorId, title, taskDate, description?, taskTime?, isAMC? }
```

**What happens:**
- Validates service request exists, vendor exists and is approved
- Creates task with `organization = vendor.organizationId`
- Sets `taskAmount = serviceRequest.total_price`
- Updates ServiceRequest.status → "Assigned"

### 7.3 AMC Tasks

- Set `isAMC: true` when creating task
- AMC tasks are manually assigned only (no auto-assignment)
- Linked to `amcContract` for tracking

---

## 8. Revenue & Commission Flow

### 8.1 When Revenue is Generated

Revenue is **only generated when a Task is completed** (`PUT /api/tasks/:taskId/complete`).

> ⚠️ **Current Gap:** Service requests completed directly (without a Task) do NOT generate revenue transactions.

### 8.2 Commission Split Calculation

```
Task Amount: 1000 AED

Step 1: Organization Commission (if vendor belongs to org)
  → Org commission: 15%
  → Org share: 1000 × 15% = 150 AED

Step 2: Property Owner Commission (if task linked to property)
  → Owner commission: 5%
  → Owner share: 1000 × 5% = 50 AED

Step 3: Vendor Gets Remainder
  → Vendor share: 1000 - 150 - 50 = 800 AED
```

### 8.3 Revenue Transaction Record

```javascript
{
  task,                              // Required - linked task
  serviceRequest,                    // Service request reference
  vendor,                            // Required - who did the work
  organization,                      // Null if independent vendor
  propertyOwner,                     // Null if not property-linked

  totalAmount: 1000,
  organizationCommissionPercent: 15,
  organizationShare: 150,
  propertyOwnerCommissionPercent: 5,
  propertyOwnerShare: 50,
  vendorShare: 800,
  platformShare: 0,

  paymentStatus: "Pending"           // Pending → Processing → Completed
}
```

### 8.4 Revenue Dashboards

| Dashboard | Endpoint | What They See |
|-----------|----------|---------------|
| Admin | `GET /api/revenue` | All transactions, full summary, filter by vendor/org/owner |
| Organization | `GET /api/revenue/organization` | Only their transactions, org share, vendor share |
| Property Owner | `GET /api/revenue/property-owner` | Only their transactions, owner share |

### 8.5 Payment Status Management

```
PUT /api/revenue/:id/status (Admin only)
Body: { paymentStatus: "Completed" }
```

When set to "Completed": timestamps set for vendorPaidAt, organizationPaidAt, propertyOwnerPaidAt

---

## 9. API Reference Matrix

### Authentication & Vendor

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | User/Vendor self-registration |
| POST | `/api/auth/login` | Public | Login (all roles) |
| GET | `/api/auth/me` | Authenticated | Get profile |
| PUT | `/api/auth/updatedetails` | Authenticated | Update profile |
| POST | `/api/auth/admin/create-vendor` | Admin | Create vendor (auto-approved) |
| GET | `/api/auth/admin/vendors` | Admin | List all vendors |

### Organizations

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/organizations/login` | Public | Organization login |
| POST | `/api/organizations` | Admin | Create organization |
| GET | `/api/organizations` | Admin | List organizations |
| GET | `/api/organizations/:id` | Admin/Org | Get org details |
| PUT | `/api/organizations/:id` | Admin | Update organization |
| GET | `/api/organizations/dashboard` | Org | Own dashboard |
| GET | `/api/organizations/:id/dashboard` | Admin | Org dashboard by ID |
| GET | `/api/organizations/vendors` | Org | Own vendors |
| POST | `/api/organizations/vendors` | Org | Create vendor under org |

### Properties & Owners

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/properties/owners/login` | Public | Owner login |
| POST | `/api/properties/owners` | Admin | Create property owner |
| GET | `/api/properties/owners` | Admin | List owners |
| POST | `/api/properties` | Admin | Create property |
| GET | `/api/properties` | Admin/Owner | List properties |
| GET | `/api/properties/:id` | Admin/Owner | Property + units |
| POST | `/api/properties/:propertyId/units` | Admin | Create unit |
| POST | `/api/properties/:propertyId/units/bulk` | Admin | Bulk create units |
| GET | `/api/properties/owner/dashboard` | Owner | Dashboard |
| GET | `/api/properties/owner/service-requests` | Owner | Tenant requests |
| POST | `/api/properties/owner/service-requests` | Owner | Request on behalf |

### Referral Codes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/referral-codes` | Owner | Generate code |
| GET | `/api/referral-codes` | Owner | List my codes |
| PUT | `/api/referral-codes/:id/deactivate` | Owner | Deactivate code |
| POST | `/api/referral-codes/redeem` | User | Redeem code |

### Tasks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/tasks` | Admin | Create task |
| GET | `/api/tasks` | Admin | List all tasks |
| GET | `/api/tasks/my-tasks` | Vendor | My tasks |
| GET | `/api/tasks/:taskId` | Admin/Vendor | Task details |
| PUT | `/api/tasks/:taskId/accept` | Vendor | Accept task |
| PUT | `/api/tasks/:taskId/cancel` | Vendor | Cancel task |
| PUT | `/api/tasks/:taskId/start` | Vendor | Start task |
| PUT | `/api/tasks/:taskId/complete` | Vendor | Complete task |

### Revenue

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/revenue` | Admin | All revenue |
| PUT | `/api/revenue/:id/status` | Admin | Update payment status |
| GET | `/api/revenue/organization` | Org | Org revenue |
| GET | `/api/revenue/property-owner` | Owner | Owner revenue |
