# Organization & Property Owner Portal Dashboards

## Overview

The system has **three portal types** each with their own login and dashboard:

| Portal | URL Prefix | Role | Login URL |
|--------|-----------|------|-----------|
| **Admin** | `/admin` | Staff (3-11) | `/admin/login` |
| **Organization** | `/organization` | Organization (13) | `/organization/login` |
| **Property Owner** | `/property-owner` | Property Owner (12) | `/property-owner/login` |

---

## 1. Organization Portal

### 1.1 How Organizations Are Created
- **Admin only** — via Admin Dashboard → Organizations page
- Admin fills: Name, Email, Password, Phone, City, Address, Commission %
- Backend creates both an `Organization` document and a `User` with `role: 13`
- The organization can then login independently

### 1.2 Organization Login Flow
```
POST /api/organizations/login
Body: { email, password }
Response: { token, organization: { _id, name, email, ... } }
```
- Frontend stores token via `useAuth().login(token, { _id, name, email, role: 13 })`
- Redirects to `/organization` (dashboard)
- Layout checks `user.role === 13` to render sidebar

### 1.3 Organization Dashboard (`/organization`)
Shows stat cards fetched from `GET /api/organizations/dashboard`:
- **Vendors**: Total count, Active (approved) count
- **Tasks**: Total, Completed, Current (in-progress)
- **Revenue**: Total revenue, Organization share, Pending payments, Completed payments

### 1.4 Vendor Management (`/organization/vendors`)
Organizations can create and manage their own vendors.

**List Vendors**: `GET /api/organizations/vendors?page=1&limit=10`
- Shows: Name, Email, Phone, Assigned Service, Approval Status, Date
- Paginated table

**Create Vendor**: `POST /api/organizations/vendors`
- Fields: firstName, lastName, email, mobileNumber, password
- Vendor is **auto-approved** (no admin review needed)
- Vendor is **auto-linked** to the organization (organizationId set automatically)
- Vendor inherits the organization's commission percentage for revenue splits

### 1.5 Revenue Tracking (`/organization/revenue`)
`GET /api/revenue/organization?page=1&limit=10&paymentStatus=`

Shows:
- **Summary cards**: Total revenue, Organization share, Pending payments, Completed payments
- **Transactions table**: Vendor, Task, Total Amount, Org Share, Vendor Share, Status, Date
- **Filter**: By payment status (All, Pending, Completed)

### 1.6 How Organization Commission Works
When a vendor under an organization completes work:
1. Revenue transaction is generated (on payment received or task completion)
2. Commission split: Organization gets `commissionPercentage`% of total
3. Vendor gets the remainder (after org + property owner shares)
4. Organization can track their earnings in real-time

---

## 2. Property Owner Portal

### 2.1 How Property Owners Are Created
- **Admin only** — via Admin Dashboard → Properties page → Owners tab
- Admin fills: Name, Email, Password, Phone, City, Commission %, ID Type, ID Number
- Backend creates a `PropertyOwner` document and a `User` with `role: 12`
- Admin then creates Properties and Units under the owner

### 2.2 Property Owner Login Flow
```
POST /api/properties/owners/login
Body: { email, password }
Response: { token, owner: { _id, name, email, ... } }
```
- Frontend stores token via `useAuth().login(token, { _id, name, email, role: 12 })`
- Redirects to `/property-owner` (dashboard)
- Layout checks `user.role === 12`

### 2.3 Property Owner Dashboard (`/property-owner`)
Shows comprehensive stats from `GET /api/properties/owner/dashboard`:
- **Properties**: Total count, list of properties (name, city, type)
- **Units**: Total, Occupied, Vacant
- **Tenants**: Total unique tenants, list with unit/property mapping
- **Service Requests**: Total, Pending, Completed, Recent 10 requests
- **AMC Contracts**: Count

### 2.4 Properties Management (`/property-owner/properties`)
`GET /api/properties?page=1&limit=10` (scoped to owner's properties)

Shows property cards with expandable unit details:
- Property: Name, City, Type badge
- Units (expandable): Unit Number, Type, Floor, Status (Occupied/Vacant), Tenant name
- Click property to load detailed unit data via `GET /api/properties/:id`

### 2.5 Service Requests (`/property-owner/service-requests`)
`GET /api/properties/owner/service-requests?page=1&limit=10&status=&propertyId=`

**View Requests**:
- Table: User Name, Service, Status badge, Date, Amount, Vendor
- Filters: Status dropdown, Property dropdown
- Paginated

**Create Request on Behalf of Tenant**:
`POST /api/properties/owner/service-requests`
- Select: Tenant (from tenants list), Unit, Service Name, Description, Price, Date
- Useful when property owner wants to request maintenance for a tenant

### 2.6 Referral Codes (`/property-owner/referral-codes`)
Property owners generate codes to link tenants to their properties/units.

**Generate Code**: `POST /api/referral-codes`
- Fields: Property (required), Unit (optional), Expiry Days (default 7), Max Uses (default 1)
- Returns a unique code the tenant can redeem

**View Codes**: `GET /api/referral-codes`
- Table: Code (copyable), Property, Unit, Expires, Max Uses, Used Count, Status badge
- Expandable row showing who redeemed the code
- Deactivate action: `PUT /api/referral-codes/:id/deactivate`

**Tenant Redemption Flow**:
1. Owner generates referral code for a property/unit
2. Owner shares code with tenant (via any channel)
3. Tenant logs into the app and redeems code: `POST /api/referral-codes/redeem`
4. Tenant is linked to the property/unit
5. Owner can now see tenant's service requests and create requests on their behalf

### 2.7 Revenue Tracking (`/property-owner/revenue`)
`GET /api/revenue/property-owner?page=1&limit=10`

Shows:
- **Summary cards**: Total Revenue, Property Owner Share, Pending Payments, Completed Payments
- **Transactions table**: Vendor, Task, Total Amount, Owner Share, Status, Date
- Paginated

### 2.8 How Property Owner Commission Works
When service requests linked to their properties generate revenue:
1. Revenue transaction is auto-generated on payment/completion
2. Commission split: Owner gets `commissionPercentage`% of total (after org share if applicable)
3. Property owner can track earnings per transaction

---

## 3. Inter-linking of Roles

### Revenue Commission Split Order
```
Total Amount
  ├─ Organization Share (org.commissionPercentage %)  [if vendor has org]
  ├─ Property Owner Share (owner.commissionPercentage %)  [if linked to property]
  └─ Vendor Share (remainder)
```

### Vendor Creation Methods
| Method | Created By | Organization | Approval | Route |
|--------|-----------|-------------|----------|-------|
| Self-register | Vendor | None (independent) | Needs admin approval | App registration |
| Admin creates | Admin | Optional (dropdown) | Auto-approved | Admin → Add Vendor |
| Org creates | Organization | Auto-linked | Auto-approved | Org Portal → Add Vendor |

### Data Flow
```
Admin creates Organization (with commission %)
  └─ Organization creates Vendors (auto-linked, auto-approved)
       └─ Vendors complete Tasks
            └─ Revenue Transaction generated
                 ├─ Organization gets their %
                 ├─ Property Owner gets their % (if property linked)
                 └─ Vendor gets remainder

Admin creates Property Owner (with commission %)
  └─ Admin creates Properties & Units under owner
       └─ Owner generates Referral Codes
            └─ Tenants redeem codes (linked to property/unit)
                 └─ Tenants request services (or owner requests on behalf)
                      └─ Service Request → Payment → Revenue Transaction
                           └─ Property Owner gets their commission %
```

---

## 4. API Reference

### Organization Portal Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/organizations/login` | Public | Organization login |
| GET | `/api/organizations/dashboard` | Organization | Dashboard stats |
| GET | `/api/organizations/vendors` | Organization | List vendors |
| POST | `/api/organizations/vendors` | Organization | Create vendor |
| GET | `/api/revenue/organization` | Organization | Revenue data |

### Property Owner Portal Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/properties/owners/login` | Public | Owner login |
| GET | `/api/properties/owner/dashboard` | Owner | Dashboard stats |
| GET | `/api/properties` | Owner/Admin | List properties |
| GET | `/api/properties/:id` | Owner/Admin | Property detail with units |
| GET | `/api/properties/owner/service-requests` | Owner | Service requests |
| POST | `/api/properties/owner/service-requests` | Owner | Create request on behalf |
| POST | `/api/referral-codes` | Owner | Generate referral code |
| GET | `/api/referral-codes` | Owner | List referral codes |
| PUT | `/api/referral-codes/:id/deactivate` | Owner | Deactivate code |
| GET | `/api/revenue/property-owner` | Owner | Revenue data |

---

## 5. Frontend File Structure

```
src/app/
├── organization/
│   ├── layout.tsx          # Layout with sidebar + navbar (role 13 guard)
│   ├── login/page.tsx      # Organization login
│   ├── page.tsx            # Dashboard (stats cards)
│   ├── vendors/page.tsx    # Vendor list + create modal
│   └── revenue/page.tsx    # Revenue summary + transactions table
│
├── property-owner/
│   ├── layout.tsx          # Layout with sidebar + navbar (role 12 guard)
│   ├── login/page.tsx      # Property owner login
│   ├── page.tsx            # Dashboard (properties, units, tenants, requests)
│   ├── properties/page.tsx # Properties with expandable units
│   ├── service-requests/page.tsx  # Requests table + create on behalf
│   ├── referral-codes/page.tsx    # Code generation + management
│   └── revenue/page.tsx    # Revenue summary + transactions table
```
