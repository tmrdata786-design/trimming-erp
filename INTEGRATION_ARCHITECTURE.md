# Integration Architecture

## Overview

This document describes the verified integration architecture between the Trimming ERP frontend (React 19 + TypeScript + Vite) and Manager.io Server Edition at `https://promoerp.promoerp.it/`.

## Manager.io Environment

- **Server Edition URL:** `https://promoerp.promoerp.it/`
- **API Base URL:** `http://promoerp.promoerp.it/api2`
- **API Version:** 26.8.4.3664
- **Authentication:** X-API-KEY header (Base64 encoded)
- **Business:** KEEL (primary), test business available for development

## Authentication & Security

### Critical Constraints Verified

1. **No CORS Support:** Manager.io API does not return `Access-Control-Allow-Origin` headers. Browser requests from GitHub Pages (`https://<user>.github.io`) to `http://promoerp.promoerp.it/api2` will be blocked by browser CORS policy.

2. **API Key Exposure Risk:** The Manager.io API key (X-API-KEY) must never be exposed in frontend code, GitHub Pages build, or browser network tab.

3. **No Session Cookie Sharing:** Manager.io session cookies are HttpOnly and scoped to `promoerp.promoerp.it`. They cannot be accessed by a frontend on a different domain.

4. **Custom Button Context:** Custom Buttons in Manager.io can launch external URLs with query parameters, but the exact parameter syntax must be verified (not standard `{business}`, `{key}` placeholders).

### Solution: Backend Proxy (Required)

```
┌─────────────────────┐     HTTPS + JWT      ┌──────────────────────┐     Internal LAN/VPN     ┌────────────────────┐
│  GitHub Pages       │ ◄──────────────────► │  Backend Proxy       │ ◄─────────────────────►  │  Manager.io API    │
│  (Static Frontend)  │   REST API + WS      │  (Express + PG)      │   X-API-KEY Header       │  (promoerp.it)     │
└─────────────────────┘                      └──────────────────────┘                          └────────────────────┘
       ▲                                             ▲
       │                                             │
       │         Custom Button Launch                │
       └─────────────────────────────────────────────┘
              (passes business, entity, key via URL)
```

## Backend Proxy Design

### Technology Stack
- **Runtime:** Node.js 20+ (Express 4.x)
- **Database:** PostgreSQL 15+ (operational records)
- **Auth:** JWT tokens issued by proxy after validating Manager.io context
- **Process Manager:** PM2 or systemd
- **Reverse Proxy:** Nginx + Let's Encrypt TLS

### API Endpoints (Proxy)

#### Master Data Sync
```
GET  /api/manager/items              # List inventory items with custom fields
GET  /api/manager/items/:key         # Get single item with custom fields
POST /api/manager/items/sync         # Trigger full sync from Manager.io

GET  /api/manager/locations          # List inventory locations (hierarchy)
GET  /api/manager/locations/:key     # Get location details

GET  /api/manager/suppliers          # List suppliers with custom fields
GET  /api/manager/suppliers/:key     # Get supplier details

GET  /api/manager/employees          # List employees with custom fields (if module enabled)
```

#### Inventory Operations
```
GET  /api/manager/stock-balances     # Query stock balances (item, location, status)
POST /api/manager/inventory-transfers # Create Inventory Transfer (PTN)
GET  /api/manager/inventory-transfers/:key # Get transfer details

POST /api/manager/inventory-writeoffs # Create write-off (adjustments)
POST /api/manager/inventory-counts    # Create inventory count (stocktaking)
```

#### Operational Records (Application-owned, stored in PostgreSQL)
```
# Work Orders
GET    /api/work-orders
POST   /api/work-orders
GET    /api/work-orders/:id
PUT    /api/work-orders/:id
POST   /api/work-orders/:id/close

# QC Inspections
GET    /api/qc-inspections
POST   /api/qc-inspections
GET    /api/qc-inspections/:id

# Rework Orders
GET    /api/rework-orders
POST   /api/rework-orders
GET    /api/rework-orders/:id
PUT    /api/rework-orders/:id

# OGP/IGP
GET    /api/ogp
POST   /api/ogp
GET    /api/ogp/:id
PUT    /api/ogp/:id
GET    /api/igp
POST   /api/igp
GET    /api/igp/:id

# Vendor Earnings & Payments
GET    /api/vendor-earnings
POST   /api/vendor-earnings
PUT    /api/vendor-earnings/:id/approve
GET    /api/vendor-payments
POST   /api/vendor-payments

# Employee Costing
GET    /api/employee-costing
POST   /api/employee-costing

# Stocktaking
GET    /api/stocktaking-sessions
POST   /api/stocktaking-sessions
PUT    /api/stocktaking-sessions/:id
POST   /api/stocktaking-sessions/:id/adjust

# Reports
GET    /api/reports/:reportType
```

### Authentication Flow

1. **Custom Button Launch:** User clicks "Open Trimming ERP" in Manager.io
   - URL: `https://<user>.github.io/trimming-erp/?business=KEEL&entity=inventory-item&key=<uuid>`
   - Frontend receives context via URL params

2. **Frontend → Proxy Handshake:**
   - Frontend calls `POST /api/auth/verify-context` with `{business, entity, key, userEmail}`
   - Proxy validates business exists, entity/key are valid (calls Manager.io API)
   - Proxy returns JWT with claims: `{business, userEmail, roles, exp}`

3. **Subsequent Requests:**
   - Frontend includes `Authorization: Bearer <JWT>` header
   - Proxy validates JWT, checks role permissions, proxies to Manager.io

### Custom Button Parameter Passing

**Verified Mechanism:** Manager.io Custom Buttons support URL templates with placeholders.
**Syntax to Verify:** `{Business}`, `{Key}`, `{Entity}`, `{User}` or similar.
**Action:** Test each of the 8 existing buttons to document actual parameter format.

## Data Ownership Model

| Data Category | System of Record | Sync Direction |
|---------------|------------------|----------------|
| Inventory Items | Manager.io | Manager.io → Proxy (read), Proxy → Manager.io (write custom fields) |
| Inventory Locations | Manager.io | Manager.io → Proxy (read-only) |
| Suppliers | Manager.io | Manager.io → Proxy (read), Proxy → Manager.io (write custom fields) |
| Employees | Manager.io | Manager.io → Proxy (read), Proxy → Manager.io (write custom fields) |
| Inventory Transfers (PTN) | Manager.io | Proxy → Manager.io (create), Manager.io → Proxy (read) |
| Inventory Write-offs | Manager.io | Proxy → Manager.io (create adjustments) |
| Inventory Counts | Manager.io | Proxy → Manager.io (create counts) |
| Supplier Payments | Manager.io | Proxy → Manager.io (create payments) |
| Work Orders | PostgreSQL | Application only |
| QC Inspections | PostgreSQL | Application only |
| Rework Orders | PostgreSQL | Application only |
| OGP/IGP Details | PostgreSQL | Application only |
| Vendor Earning Lines | PostgreSQL | Application only (summary → Manager.io Supplier Payment) |
| Employee Cost Allocations | PostgreSQL | Application only (summary → Manager.io Journal Entry) |
| Stocktaking Sessions | PostgreSQL | Application only (counts → Manager.io Inventory Count) |
| Audit Logs | PostgreSQL | Application only |

## Frontend Integration Layer

### Service Architecture
```
src/services/
├── managerApi.ts          # Proxy API client (authenticated)
├── managerSync.ts         # Master data synchronization
├── inventoryEngine.ts     # Updated to use Manager.io transactions
├── operationalApi.ts      # Work Orders, QC, Rework, OGP/IGP, etc.
├── auth.ts                # JWT handling, context verification
└── storage.ts             # DEPRECATED - localStorage fallback only
```

### Connection State Management
- `ConnectionStatus` enum: `unknown` | `connecting` | `connected` | `disconnected` | `error`
- React Context provider for connection state
- Automatic retry with exponential backoff
- Offline queue for mutations (IndexedDB)
- Visual indicator in TopBar (green/red dot)

### Error Handling
- Network errors → queue locally, retry on reconnect
- 401/403 → redirect to Custom Button launch (re-authenticate)
- 409 (conflict) → show conflict resolution UI
- 422 (validation) → show field-level errors
- 5xx → show "Manager.io unavailable" banner

## Deployment

### GitHub Pages (Frontend)
- **Repository:** `github.com/<org>/trimming-erp`
- **Build Command:** `npm run build`
- **Output Dir:** `dist/`
- **Base Path:** `/trimming-erp/` (configured in `vite.config.ts`)
- **Deploy Branch:** `gh-pages` via GitHub Actions

### Backend Proxy (VPS)
- **Host:** To be provisioned (DigitalOcean/Hetzner/AWS/on-prem)
- **Domain:** `api.trimming-erp.yourdomain.com`
- **TLS:** Let's Encrypt via Nginx
- **Database:** PostgreSQL on same VPS or managed (Neon/Supabase/RDS)
- **Environment Variables:**
  ```
  MANAGER_API_URL=http://promoerp.promoerp.it/api2
  MANAGER_API_KEY=<base64-key>
  DATABASE_URL=postgresql://...
  JWT_SECRET=<random-256-bit>
  FRONTEND_URL=https://<user>.github.io/trimming-erp
  ALLOWED_BUSINESSES=KEEL,TEST
  ```

## Verification Checklist

- [ ] Manager.io API responds to authenticated requests via proxy
- [ ] Custom Buttons launch frontend with correct context parameters
- [ ] JWT authentication works end-to-end
- [ ] Master data sync retrieves all custom fields
- [ ] Inventory Transfer (PTN) creates successfully in Manager.io
- [ ] Stock balances match Manager.io reports
- [ ] CORS headers present on proxy responses
- [ ] Rate limiting and audit logging active on proxy
- [ ] GitHub Pages build deploys successfully
- [ ] Frontend loads from GitHub Pages and connects to proxy

## Known Limitations

1. **Real-time updates:** Manager.io does not support webhooks. Polling or manual refresh required.
2. **Batch operations:** API creates one record per request. Bulk imports require looping.
3. **Custom field writes:** Only certain entity types support custom field updates via API.
4. **Employee module:** May not be enabled in all Manager.io installations.
5. **Inventory status field:** Manager.io uses location-based tracking, not status field. Application status (untrimmed/qc_pending/etc.) mapped to location hierarchy.