# Treasury Management System - Frontend API Integration Guide

## Overview
This guide documents all the API endpoints integrated into the React frontend for the University Treasury Management System.

**Base URL:** `http://ec2-13-60-247-126.eu-north-1.compute.amazonaws.com:10000` for production, or `/api` in development via the Vite proxy.

## Authentication

All requests (except `/api/auth/**` and `/api/files/{transactionId}`) require:
```javascript
Authorization: Bearer <jwt_token>
```

The JWT token is automatically attached by the Axios interceptor.

### Session Management
- JWT expires after **24 hours**
- No refresh token endpoint - user must login again
- On 401 response, user is redirected to login page
- Store token: `localStorage.setItem('ts_token', token)`
- Store user: `localStorage.setItem('ts_user', JSON.stringify(user))`

## Response Format

All API responses follow this envelope:
```json
{
  "success": true/false,
  "message": "string",
  "data": {} // varies by endpoint
}
```

The Axios response interceptor automatically unpacks this to return just `data`.

---

## API Endpoints by Role

### 🔐 AUTH (Public)

#### Login
```javascript
await apiService.auth.login(username, password);
```
**Returns:** `{ token: string, user: User }`

Check `user.isFirstLogin` after login - if true, force password change.

#### Change Password
```javascript
await apiService.auth.changePassword(username, oldPassword, newPassword);
```

#### Forgot Password - Request OTP
```javascript
await apiService.auth.forgotPasswordRequestOtp(username);
```

#### Forgot Password - Reset
```javascript
await apiService.auth.forgotPasswordReset(username, otp, newPassword);
```

---

### 👤 USER (All authenticated users)

#### Get Current User Profile
```javascript
await apiService.user.getMe();
```
**Returns:** `User`

#### Dashboard - Main Fund Summary
```javascript
await apiService.user.getDashboard();
```
**Returns:** `DashboardStats`

Shows:
- Main fund balance
- Total income/expense
- Event count, user count
- Monthly trend (6-month rolling)
- Expense by category

#### My Transactions
```javascript
await apiService.user.getMyTransactions(page = 0, size = 10);
```
**Returns:** `PagedResponse<Transaction>` - Only transactions uploaded by current user

#### Main Fund Transactions
```javascript
await apiService.user.getMainFundTransactions(page = 0, size = 10);
```
**Returns:** `PagedResponse<Transaction>` - Main fund (eventId = null)

#### Event Transactions
```javascript
await apiService.user.getEventTransactions(eventId, page = 0, size = 10);
```
**Returns:** `PagedResponse<Transaction>` - Transactions for specific event

#### All Events
```javascript
await apiService.user.getEvents(page = 0, size = 10);
```
**Returns:** `PagedResponse<Event>`

#### My Contributions
```javascript
await apiService.user.getContributions(page = 0, size = 10);
```
**Returns:** `PagedResponse<Contribution>` - Current user's contributions only

#### My Event Contributions
```javascript
await apiService.user.getEventContributions(eventId, page = 0, size = 10);
```
**Returns:** `PagedResponse<Contribution>` - Current user's contributions for event

#### View Receipt/Proof
```javascript
// Get URL for receipt
const url = apiService.files.getReceiptUrl(transactionId);
// Use in <img> or <a> tag

// Or fetch as blob
const blob = await apiService.files.getReceiptFile(transactionId);
```

---

### 👨‍💼 TREASURER

#### Events

**Create Event**
```javascript
await apiService.treasurer.createEvent({
  name: "Graduation Gala",
  description: "Optional",
  startDate: "2026-07-01", // ISO format
  endDate: "2026-07-03",   // Optional
  treasurerId: "user-uuid" // Optional
});
```

**List Events**
```javascript
await apiService.treasurer.getEvents(page, size);
```

**Delete Event**
```javascript
await apiService.treasurer.deleteEvent(eventId);
```
⚠️ Cascades to transactions but NOT to contributions (commented out in backend)

**Assign Temporary Treasurer**
```javascript
await apiService.treasurer.assignTemporaryTreasurer(eventId, username);
```

**Get Event Summary**
```javascript
await apiService.treasurer.getEventSummary(eventId);
```
**Returns:** Full event with transactions and contributions

**Get Event PDF Report**
```javascript
const blob = await apiService.treasurer.getEventReport(eventId);
downloadPDF(blob, 'event_report.pdf');
// OR
openPDFInTab(blob); // View in new tab
```

**Get Event Contribution Report**
```javascript
const blob = await apiService.treasurer.getEventContributionReport(eventId);
// PDF is currently empty (0 bytes) - backend issue #2
```

---

#### Transactions

**Create Transaction**
```javascript
await apiService.treasurer.createTransaction({
  title: "Sponsorship Income",
  amount: 2500,
  type: "INCOME", // or "EXPENSE"
  category: "Sponsorship",
  description: "Optional",
  eventId: "optional-event-id", // omit for Main Fund
  file: fileObject // Required if type=EXPENSE, optional if type=INCOME
});
```

**Main Fund Transactions**
```javascript
await apiService.treasurer.getMainFundTransactions(page, size);
```

**Event Transactions**
```javascript
await apiService.treasurer.getEventTransactions(eventId, page, size);
```

**Delete Transaction**
```javascript
await apiService.treasurer.deleteTransaction(transactionId);
```
Soft delete + recalculates event balance

---

#### Contributions

**Create Contribution**
```javascript
await apiService.treasurer.createContribution({
  userId: "user-id",
  month: "2026-06", // YYYY-MM format
  amount: 150,
  eventId: "optional" // omit for Main Fund
});
```

⚠️ **Main Fund Rule:** User must have paid all previous months (from 2026-06 onwards)

**Get Contribution**
```javascript
await apiService.treasurer.getContribution(contributionId);
```

**List Event Contributions**
```javascript
await apiService.treasurer.getEventContributions(eventId, page, size);
```

**Mark as Paid**
```javascript
await apiService.treasurer.payContribution(contributionId);
```
Creates linked INCOME transaction (category: CONTRIBUTION)

**Update Contribution**
```javascript
await apiService.treasurer.updateContribution(contributionId, {
  month: "2026-07",
  amount: 200,
  eventId: "optional"
});
```

**Delete Contribution**
```javascript
await apiService.treasurer.deleteContribution(contributionId);
```
If paid, also deletes linked transaction

**Send Contribution Reminders**
```javascript
await apiService.treasurer.sendContributionReminders();
```
Emails unpaid members for current month

---

#### Contribution Configuration

**Get Default Amount**
```javascript
const amount = await apiService.treasurer.getDefaultContributionAmount();
```

**Update Default Amount**
```javascript
await apiService.treasurer.updateDefaultContributionAmount(250);
```

⚠️ **WARNING:** Stored in memory only - resets on backend restart

---

#### Reports

**Main Fund Monthly Report**
```javascript
const blob = await apiService.treasurer.getMainFundMonthlyReport("2026-06");
downloadPDF(blob, 'main_fund_2026-06.pdf');
```

**Contributions Period Report (PDF)**
```javascript
const blob = await apiService.treasurer.getContributionsPeriodReport(
  "2026-06", // start month
  "2026-12", // end month
  "user-id"  // optional - omit for all users
);
```

**User Contribution Details (JSON)**
```javascript
const details = await apiService.treasurer.getUserContributionDetails(
  userId,
  "2026-06",
  "2026-12"
);
```

**All Users Contributions**
```javascript
const contributions = await apiService.treasurer.getUserContributions(
  userId,    // optional
  page,
  size
);
```

---

#### Emails

**Send Test Email**
```javascript
await apiService.treasurer.sendTestEmail("someone@example.com");
```

**Send Broadcast Email**
```javascript
await apiService.treasurer.sendBroadcastEmail(
  "Subject: Important Update",
  "Email message body (HTML supported)"
);
```

⚠️ **No dry-run endpoint** - build confirmation modal before sending

---

### 🛡️ SUPER_ADMIN (All treasurer actions + user management)

#### Create User
```javascript
await apiService.admin.createUser({
  username: "john_doe",
  email: "john@university.edu",
  fullName: "John Doe",
  password: "TempPassword123",
  role: "TREASURER" // or "USER"
});
```

#### List All Users
```javascript
await apiService.admin.getAllUsers(page, size);
```

#### Get Single User
```javascript
await apiService.admin.getUser(userId);
```

#### Delete User
```javascript
await apiService.admin.deleteUser(userId);
```

#### Reset User Password
```javascript
await apiService.admin.resetUserPassword(userId, newPassword);
```
Forces that user through password change on next login

#### Audit Logs
```javascript
await apiService.admin.getAuditLogs();
```
Returns 50 most recent audit entries (fixed limit, no pagination)

---

### 🎟️ TEMPORARY TREASURER

A regular USER assigned to an event gets elevated permissions **for that event only**:
- ✅ Create transactions for event
- ✅ View event report PDF
- ✅ View event contribution report PDF
- ✅ Send broadcast emails
- ❌ Cannot create other events
- ❌ Cannot manage users
- ❌ Cannot view audit logs

These checks happen in backend code (per-endpoint), not Spring Security rules.

---

## Error Handling

```javascript
try {
  const data = await apiService.auth.login(username, password);
} catch (error) {
  const message = getErrorMessage(error);
  
  // Check status
  if (isErrorStatus(error, 400)) {
    // Validation error
  } else if (isErrorStatus(error, 401)) {
    // Invalid credentials or token expired
  } else if (isErrorStatus(error, 403)) {
    // Access denied or first login password change required
  } else if (isErrorStatus(error, 404)) {
    // Resource not found
  } else if (isErrorStatus(error, 429)) {
    // Rate limited (80 req/min per IP)
  } else if (isErrorStatus(error, 500)) {
    // Business logic error (parse message for details)
  }
}
```

---

## Important Business Rules

### Sequential Contribution Payment (Main Fund Only)
When creating a Main Fund contribution for a user, backend checks that all prior months (back to 2026-06) are already paid. Fail with HTTP 500 if violated.

**Frontend:** Show warning in form if earlier months aren't paid, disable future months until prior are confirmed paid.

### Mandatory Expense Receipts
- EXPENSE transactions **must** have file
- INCOME transactions file is optional
- Enforced at backend, but validate client-side too

### Soft Delete Everywhere
Nothing is permanently deleted. All deletes set `is_deleted = true` in database.
No "restore" endpoint exposed, so treat as permanent in UI.

### Event Balances Auto-Recalculate
After any transaction create/delete for an event, backend re-sums ALL non-deleted transactions and overwrites:
- `totalIncome`
- `totalExpense`
- `totalBalance`

**Don't increment/decrement client-side** - always re-fetch event after transaction mutations.

### 24-Hour JWT Expiry
- No refresh token
- On 401, redirect to login
- Show "session expired" message
- Build a logout flow

### Automatic Monthly Contribution Generation
Cron job runs on 1st of each month at 01:00 server time.
Auto-creates unpaid Main Fund contribution for every active user.

---

## File Uploads (Receipts)

Upload receipts to Cloudinary:

```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// For EXPENSE - required
// For INCOME - optional
await apiService.treasurer.createTransaction({
  title: "Office Supplies",
  amount: 150,
  type: "EXPENSE",
  category: "Supplies",
  file: file // multipart/form-data handled by axios
});
```

To display/download receipt:

```javascript
// Public endpoint - no auth needed
const url = apiService.files.getReceiptUrl(transactionId);
// Use in <img src={url} /> or <a href={url} download>

// Or fetch and download manually
const blob = await apiService.files.getReceiptFile(transactionId);
downloadPDF(blob, 'receipt.pdf');
```

---

## Pagination

All list endpoints support:
- `page` (0-based, default 0)
- `size` (default 10)

```javascript
// Get second page, 20 items per page
await apiService.admin.getAllUsers(1, 20);
```

Response shape:
```json
{
  "content": [...],
  "totalElements": 100,
  "totalPages": 5,
  "size": 20,
  "number": 1,
  "first": false,
  "last": false,
  "numberOfElements": 20,
  "empty": false
}
```

---

## Date/Time Formats

- **Timestamps** (`createdAt`, `lastLoginAt`): Full ISO-8601 datetime
  - Example: `2026-06-24T14:30:00.000Z`
  
- **Dates** (`startDate`, `endDate`, `dueDate`): ISO date
  - Example: `2026-06-24`
  
- **Month** (`Contribution.month`, report queries): YYYY-MM only
  - Example: `2026-06`

---

## Rate Limiting

- **Global limit:** 80 requests per minute per IP address
- **Response:** HTTP 429 with message "Too Many Requests"
- **Recommendation:** Avoid aggressive polling
  - Dashboard/audit: max once every few seconds
  - Don't poll every 100ms

---

## Known Issues & Limitations

1. **No CORS configured** - Ensure backend has CORS policy for your frontend origin
2. **Contribution report empty** - `generateEventContributionReport()` returns 0 bytes
3. **Default contribution amount in-memory** - Resets on backend restart
4. **No membership privacy check** - Any logged-in user can view any other user's contributions
5. **last_login_at never set** - Column exists but not populated
6. **Dashboard counts include soft-deleted rows** - May read higher than actual
7. **Event delete doesn't cascade to contributions** - Commented out in backend code
8. **Cold start latency** - Render free tier: first request after idle takes 30-60 seconds

---

## Utility Functions

```javascript
// Download PDF to user's machine
downloadPDF(blob, 'filename.pdf');

// Open PDF in new browser tab for viewing
openPDFInTab(blob);

// Check if user has specific role
hasRole(user.role, ['TREASURER', 'SUPER_ADMIN']);

// Check if user is temporary treasurer for event
isTemporaryTreasurerForEvent(user, event);

// Parse error message
const msg = getErrorMessage(error);

// Check error status
if (isErrorStatus(error, 403)) { ... }
```

---

## Example: Login & Forced Password Change Flow

```javascript
// Step 1: Login
const response = await apiService.auth.login(username, password);
const { token, user } = response;

localStorage.setItem('ts_token', token);
localStorage.setItem('ts_user', JSON.stringify(user));

// Step 2: Check if first login
if (user.isFirstLogin) {
  // Show forced password change screen
  navigate('/change-password');
} else {
  // Show dashboard
  navigate('/dashboard');
}

// Step 3: Change password
await apiService.auth.changePassword(username, oldPassword, newPassword);
// Backend sets isFirstLogin = false
// Now user can access rest of app
```

---

## Example: Create Transaction with File Upload

```javascript
const formRef = useRef<HTMLFormElement>(null);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  
  const formData = new FormData(formRef.current!);
  const file = formData.get('receipt') as File;

  try {
    await apiService.treasurer.createTransaction({
      title: formData.get('title'),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type'), // INCOME or EXPENSE
      category: formData.get('category'),
      description: formData.get('description'),
      eventId: formData.get('eventId') || undefined,
      file: file && file.size > 0 ? file : undefined
    });
    
    toast.success('Transaction created');
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}
```

---

## Example: Download Report

```javascript
async function downloadEventReport(eventId: string) {
  try {
    const blob = await apiService.treasurer.getEventReport(eventId);
    downloadPDF(blob, `event_${eventId}_report.pdf`);
    toast.success('Report downloaded');
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}

// Or open in browser tab
async function viewReport(eventId: string) {
  try {
    const blob = await apiService.treasurer.getEventReport(eventId);
    openPDFInTab(blob);
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}
```

---

## Environment Variables

In `vite.config.ts`, Vite proxy helps with local development:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://ec2-13-60-247-126.eu-north-1.compute.amazonaws.com:10000',
        changeOrigin: true
      }
    }
  }
});
```

This way, in dev mode, `/api/auth/login` proxies to the backend without CORS issues.

In production, the frontend hits the absolute URL directly (CORS must be configured on backend).

---

## Quick Reference Cheat Sheet

| Action | Endpoint | Role | Returns |
|--------|----------|------|---------|
| Login | `auth.login()` | Public | JWT + User |
| Get Profile | `user.getMe()` | All | User |
| Get Dashboard | `user.getDashboard()` | All | DashboardStats |
| List Events | `user.getEvents()` | All | PagedResponse<Event> |
| Create Event | `treasurer.createEvent()` | Treasurer | Event |
| Create Transaction | `treasurer.createTransaction()` | Treasurer | Transaction |
| Create Contribution | `treasurer.createContribution()` | Treasurer | Contribution |
| Mark Paid | `treasurer.payContribution()` | Treasurer | Contribution |
| List Users | `admin.getAllUsers()` | Admin | PagedResponse<User> |
| Create User | `admin.createUser()` | Admin | User |
| Get Audit Logs | `admin.getAuditLogs()` | Admin | AuditLog[] |
| Get Report PDF | `treasurer.getEventReport()` | Treasurer | Blob |
| Download Receipt | `files.getReceiptFile()` | All | Blob |

