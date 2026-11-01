# Testing Strategy

## Overview
This document describes the testing approach for the Trimming ERP application, including automated tests, manual acceptance tests, and integration verification.

## Test Categories

### 1. Unit Tests (Vitest)
**Location**: `src/__tests__/` (to be created)

**Coverage Targets**:
- Business logic functions (inventory engine, costing calculations)
- Data validation schemas (Zod)
- Utility functions (formatting, date handling)
- State management (DataService methods)

**Key Test Cases**:
```typescript
// Inventory Engine
- moveStock: validates negative stock prevention
- postPTN: creates correct transfers
- executeQCInspection: enforces accepted + rejected = inspected
- closeShiftWorkOrder: validates material balance invariant

// Costing
- calculateVendorEarnings: correct rate × qty
- allocateEmployeeCost: hour/production/hybrid methods
- calculateProductCost: all components summed correctly

// Validation
- WorkOrder close: material balance check
- QC Inspection: quantity invariant
- Vendor Payment: duplicate prevention
```

### 2. Component Tests (React Testing Library)
**Location**: `src/__tests__/components/`

**Target Components**:
- Form validation (PTN, WO, QC, Rework)
- Data tables (sorting, filtering, pagination)
- Modal dialogs (scanner, print, confirmation)
- Navigation (sidebar, tabs, role-based visibility)

### 3. Integration Tests (Playwright)
**Location**: `e2e/` (to be created)

**Scenarios (from specification)**:
- **Scenario A**: Internal Trimming - 1000 received → 400 PTN → 350 trimmed → QC (300 pass, 50 reject) → balance check
- **Scenario B**: Outsourced Partial Returns - 500 OGP → 300 IGP → 200 IGP → outstanding = 0
- **Scenario C**: Rework Lineage - Reject 50 → Rework PTN → Re-assign → Complete → Re-inspect (48 pass, 2 scrap)
- **Scenario D**: Payment Integrity - QC pass → earnings → approve → partial pay → final pay → balance = 0
- **Scenario E**: Planning Double Reservation - Attempt to allocate 500 when 400 available → rejection
- **Scenario F**: Stocktaking - Snapshot → physical count → variance → approve → adjustment posted
- **Scenario G**: Concurrent Transactions - Race condition on stock reservations
- **Scenario H**: Authorization - Unauthorized actions blocked
- **Scenario I**: Backup/Recovery - Export/import maintains integrity

### 4. Automated Test Suite (In-App)
**Component**: `AutomatedTestsView.tsx`
- Runs Scenarios A-I against current data
- Reports pass/fail with details
- Can run against localStorage or Manager.io proxy

## Test Data Management

### Fixtures
- **Test Business**: Use separate Manager.io business for testing (not KEEL production)
- **Demo Records**: Up to 10 clearly labelled demo records (prefix: `DEMO-`)
- **Cleanup**: Automated teardown after test runs

### Mock Strategy
- **Manager.io API**: MSW (Mock Service Worker) for unit/integration tests
- **Proxy**: Test proxy with in-memory PostgreSQL (testcontainers)
- **Frontend**: Mock `managerApi` service for component tests

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
- Lint (tsc --noEmit)
- Unit Tests (vitest run --coverage)
- Build (vite build)
- Type Check (tsc)
- E2E Tests (playwright) - on PR to main
```

### Quality Gates
- TypeScript: Zero errors
- Lint: Zero warnings (or documented exceptions)
- Unit Test Coverage: >80% for business logic
- Build: Success
- E2E: All scenarios pass

## Manual Acceptance Testing

### Checklist per Feature
- [ ] Feature works with localStorage (offline mode)
- [ ] Feature works with Manager.io proxy (online mode)
- [ ] Role-based access enforced
- [ ] Audit log entries created
- [ ] Print layouts render correctly
- [ ] QR codes scan correctly
- [ ] Data persists across refresh
- [ ] Error handling shows user-friendly messages

### User Acceptance Scenarios
1. **Store Operator**: Create PTN, receive molding, issue OGP, accept IGP, stocktake
2. **Production Planner**: Plan shifts, assign workstations, check stock, create WOs
3. **Supervisor**: Close shift WOs, approve PTNs, approve QC, approve payments
4. **QC Inspector**: Inspect batches, classify defects, route rework
5. **Accounts**: Approve vendor earnings, create payment batches, review costing

## Integration Verification

### Manager.io Connection Tests
- [ ] Custom Button launches app with correct context
- [ ] Proxy authenticates with Manager.io API key
- [ ] Master data sync retrieves items, locations, suppliers, employees
- [ ] Custom fields readable/writable via API
- [ ] Inventory Transfer creates in Manager.io
- [ ] Stock balances match Manager.io reports
- [ ] Supplier Payments create in Manager.io
- [ ] Inventory Count creates in Manager.io

### Security Tests
- [ ] API key never exposed in frontend
- [ ] JWT tokens expire and require re-auth
- [ ] Role permissions enforced on backend
- [ ] Audit log captures all mutations
- [ ] Rate limiting active on proxy
- [ ] CORS headers correct

## Performance Testing

### Targets
- Initial load: <3s on 3G
- Data fetch (1000 items): <1s
- PTN creation: <500ms
- Report generation (10k rows): <5s
- Concurrent users: 50+

### Tools
- Lighthouse CI for frontend
- k6 or Artillery for backend load testing

## Test Environment Setup

### Local Development
```bash
# Frontend
npm run dev  # http://localhost:3000

# Proxy (requires PostgreSQL)
cd proxy && npm run dev  # http://localhost:3001

# Database
docker run -d --name pg-test -e POSTGRES_DB=trimming_erp -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15
```

### CI Environment
- GitHub Actions runners
- PostgreSQL service container
- Playwright browsers pre-installed

## Known Testing Limitations

1. **No Manager.io Staging**: Production Manager.io used for integration tests (read-only where possible)
2. **No Webhooks**: Cannot test real-time sync (polling only)
3. **Custom Button Context**: Difficult to automate in CI (manual verification needed)
4. **Scanner Hardware**: Camera/USB scanner tests require physical device
5. **Printer Output**: PDF generation tested, physical printing requires printer