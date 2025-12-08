# 🚀 ZUSHH STAGING - Clean Slate Setup

Since you're in **staging environment**, starting fresh is the **BEST approach**! No complex migrations needed.

## ⚡ Quick Setup (5 minutes)

### Step 1: Clean Staging Data
```bash
npm run staging:reset
```
**This safely deletes:**
- ✅ All existing vendors
- ✅ All service requests
- ✅ All companies
- ✅ Preserves services, users, admins

### Step 2: Create Test Data
```bash
npm run staging:create-test-data
```
**Creates comprehensive test data:**
- ✅ 2 Test companies (approved, with banking & KYC)
- ✅ 3 Individual vendors (mix of approved/pending KYC)
- ✅ 2 Staff vendors (linked to companies)
- ✅ 3 Sample service requests
- ✅ 1 Test admin account

### Step 3: Test Everything! 🎯

## 🔐 Test Accounts Created

### Admin Access
```
Email: admin@zushh.test
Password: admin123
```

### Company Accounts
```
ABC Cleaning Services
Email: ahmed@abc-cleaning.test
Password: company123

Premium Home Services LLC
Email: fatima@premium-home.test
Password: company123
```

### Individual Vendor Accounts
```
Mohammed Al-Rashid (Dubai - Approved)
Email: mohammed@test-vendor.test
Password: vendor123

Sara Al-Mansouri (Abu Dhabi - Approved)
Email: sara@test-vendor.test
Password: vendor123

Omar Al-Khalifa (Sharjah - KYC Pending)
Email: omar@test-vendor.test
Password: vendor123
```

### Staff Vendor Accounts
```
Ali Al-Hassan (ABC Cleaning - Staff)
Email: ali@abc-cleaning.test
Password: vendor123

Layla Al-Rashid (Premium Home - Staff)
Email: layla@premium-home.test
Password: vendor123
```

## 🧪 Test Scenarios Available

### ✅ Complete Vendor Lifecycle
- **Registration** → **KYC Submission** → **Admin Approval** → **Service Assignment**

### ✅ Corporate Features
- Company registration & approval
- Staff vendor addition
- Company-level banking & KYC

### ✅ Admin Workflows
- Vendor approval/rejection
- KYC document review
- Banking verification
- Vendor blocking/unblocking

### ✅ Availability Management
- Weekly schedule setup
- Date blocking
- Service assignment validation

### ✅ Service Integration
- Request assignment to vendors
- Status updates by vendors
- Availability checking

## 📱 Frontend Testing Checklist

### Admin Panel
- [ ] View all vendors (filter by status, type, KYC status)
- [ ] Approve/reject vendors
- [ ] Review KYC documents
- [ ] Verify banking information
- [ ] Block/unblock vendors
- [ ] Assign services to vendors
- [ ] View company staff

### Vendor App
- [ ] Individual vendor registration
- [ ] Login with approved account
- [ ] Submit KYC documents
- [ ] Update banking info
- [ ] Set availability schedule
- [ ] Block specific dates
- [ ] View assigned requests
- [ ] Update request status

### Company Portal
- [ ] Company registration
- [ ] Company admin login
- [ ] Submit company KYC
- [ ] Update company banking
- [ ] Add staff vendors
- [ ] View staff list
- [ ] Manage company profile

## 🔄 Production Migration

When ready for production:
1. Keep these staging scripts for reference
2. Use the full migration scripts for production data
3. Test migration thoroughly in staging first

## ⚠️ Safety Notes

- **Never run these scripts in production!**
- Scripts check `NODE_ENV` to prevent accidents
- Always backup before running reset scripts
- Test data is clearly marked with `.test` domains

## 🎉 You're Ready!

With this clean setup, you can:
- ✅ Test 100% of new vendor management features
- ✅ Validate all API endpoints
- ✅ Test admin workflows
- ✅ Verify vendor experiences
- ✅ Ensure corporate features work
- ✅ Confirm service integration

**No legacy data complications - pure testing of your new system! 🚀**
