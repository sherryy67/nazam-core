# Vendor Management System Migration Guide

## 🚨 CRITICAL: Database Migration Required

The vendor management system has been completely redesigned with new schema and features. **Existing vendors and data need to be migrated** before deploying to production.

## 📋 What Changed

### Vendor Schema Updates
- **New Fields Added:**
  - `type`: Individual/Corporate vendor classification
  - `companyId`: Reference to corporate employer (for staff vendors)
  - `isStaff`: Boolean flag for corporate staff
  - `bankingInfo`: Structured banking information with verification status
  - `kycInfo`: KYC verification workflow with document uploads
  - `availabilitySchedule`: Weekly availability slots
  - `unavailableDates`: Blocked dates array
  - `approved`: Admin approval status
  - `blocked`: Admin block status with reason tracking

### New Models
- **Company Model**: For corporate vendors with staff management
- **Updated Roles**: Added `COMPANY_ADMIN` role

### API Changes
- **New Endpoints**: 20+ new endpoints for vendor management
- **Enhanced Authentication**: Separate vendor/company login flows
- **KYC Workflow**: Document upload and admin verification
- **Availability Management**: Weekly schedules and date blocking

## 🔄 Migration Steps

### Step 1: Backup Your Database
```bash
# Create a backup before migration
mongodump --db nazam-core --out backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Run Migration Script
```bash
# From project root directory
npm run migrate:vendors-new-schema
```

**What the migration does:**
- ✅ Sets default `type: 'individual'` for existing vendors
- ✅ Migrates existing banking fields to new `bankingInfo` structure
- ✅ Initializes `kycInfo` with `status: 'pending'`
- ✅ Sets `approved: true` for existing vendors (assumes they're active)
- ✅ Preserves existing availability data
- ✅ Validates all service request assignments

### Step 3: Post-Migration Tasks

#### For Existing Vendors:
1. **KYC Verification Required**
   - Existing vendors need to submit KYC documents
   - Admin must review and approve KYC
   - Set up availability schedules

2. **Banking Information Review**
   - Existing banking data is preserved but marked as `bankingVerified: false`
   - Admin needs to re-verify banking information

#### For Corporate Vendors:
1. **Company Registration**
   - Existing corporate vendors need company accounts created
   - Staff vendors need to be linked to companies

#### For Service Requests:
1. **Assignment Validation**
   - Migration script checks all vendor assignments
   - Invalid assignments are logged for manual review

## 🔍 Migration Script Output

The migration script will show:
```
🚀 Starting vendor migration to new schema...
✅ Connected to database
📊 Found X existing vendors to migrate
🔄 Migrating vendor: John Doe (john@example.com)
✅ Successfully migrated vendor: john@example.com
📈 Migration Summary:
✅ Successfully migrated: X vendors
❌ Errors: X vendors

🔍 Checking service requests...
📋 Found X service requests with vendor assignments
✅ Valid vendor assignments: X
❌ Invalid vendor assignments: X
```

## 🧪 Testing After Migration

### Test Existing Functionality
```bash
# Test vendor login still works
POST /api/auth/vendor/login
{
  "email": "existing-vendor@example.com",
  "password": "existing-password"
}

# Test service requests are still accessible
GET /api/vendors/me/requests
```

### Test New Features
```bash
# Test KYC submission
PATCH /api/vendors/me/kyc
{
  "idDocumentFront": "document-url",
  "idDocumentBack": "document-url"
}

# Test availability management
PATCH /api/vendors/me/availability/weekly
{
  "availabilitySchedule": [...]
}
```

## 🚨 Important Considerations

### Backward Compatibility
- **Existing API endpoints still work** for basic operations
- **New features require additional setup** (KYC, availability, etc.)
- **Admin approval required** for new vendor registrations

### Data Integrity
- **No data loss** - all existing fields are preserved
- **New fields initialized** with sensible defaults
- **Relationships maintained** between vendors and service requests

### Security
- **Existing passwords unchanged** - no re-hashing required
- **JWT tokens still valid** - no user logout required
- **New security features** active for new registrations

## 🔧 Troubleshooting

### Migration Fails
```bash
# Check MongoDB connection
echo $MONGO_URI

# Run with verbose logging
DEBUG=* npm run migrate:vendors-new-schema
```

### Vendor Login Issues
- Check if vendor has `approved: true`
- Verify password hashing compatibility
- Check for duplicate email/mobile issues

### Service Request Issues
- Run migration script to identify invalid assignments
- Manually reassign service requests if needed
- Check vendor approval status

## 📞 Support

If you encounter issues:
1. Check the migration script logs
2. Review the `MIGRATION_GUIDE.md` for specific scenarios
3. Test with a single vendor first before full migration
4. Contact development team with migration logs

## ✅ Post-Migration Checklist

- [ ] Database backup created
- [ ] Migration script executed successfully
- [ ] All vendors can log in
- [ ] Service requests are properly assigned
- [ ] Admin panel shows correct vendor data
- [ ] New vendor registration works
- [ ] KYC submission works
- [ ] Banking verification works
- [ ] Availability management works
- [ ] Corporate features work
- [ ] All existing integrations still function

---

**⚠️ WARNING:** Do not deploy to production without running this migration first!
