# Known Limitations

This document tracks known limitations, trade-offs, and areas for future improvement in the Trimming ERP implementation.

## Manager.io Integration Limitations

### 1. No Webhooks / Real-time Sync
- **Issue**: Manager.io does not support webhooks for data changes
- **Impact**: Frontend must poll for updates or rely on manual refresh
- **Workaround**: 5-minute background sync + manual "Refresh" button
- **Future**: Periodic reconciliation jobs to detect drift

### 2. Custom Button Context Passing
- **Issue**: Exact placeholder syntax for Custom Button URLs not fully verified
- **Impact**: Buttons may not pass `{business}`, `{key}`, `{entity}` correctly
- **Workaround**: App accepts context via URL params; user can manually enter if needed
- **Verification Needed**: Test each of 8 buttons in actual Manager.io

### 3. No CORS Support
- **Issue**: Manager.io API does not return `Access-Control-Allow-Origin` headers
- **Impact**: Frontend cannot call Manager.io directly from browser
- **Solution**: Backend proxy required (implemented)

### 4. API Key Security
- **Issue**: Manager.io API key must be kept server-side only
- **Impact**: Cannot use Manager.io API directly from GitHub Pages
- **Solution**: Proxy pattern with JWT auth (implemented)

### 4. Employee Module Availability
- **Issue**: Employee/Payroll module may not be enabled in all Manager.io installations
- **Impact**: Employee custom fields and records may not exist
- **Workaround**: Graceful degradation - app works without employees (in-house vendors only)

### 5. Custom Fields on Inventory Transfers
- **Issue**: Manager.io may not support custom fields on Inventory Transfers
- **Impact**: PTN metadata (Workstation, Assigned Worker, Stage, WO Ref) may not store in Manager.io
- **Workaround**: Store PTN metadata in application database; only stock movement in Manager.io

### 6. Stock Status Field
- **Issue**: Manager.io uses location-based tracking, not status field
- **Impact**: Application statuses (untrimmed, in_trimming, qc_pending, etc.) mapped to locations
- **Mapping**:
  - untrimmed → Raw Store / Rack / Shelf
  - in_trimming → Workstation location
  - qc_pending → QC Holding
  - rework_holding → Rework Holding
  - approved_finished → Finished Store
  - scrapped → QC Rejected

### 7. Document Numbering
- **Issue**: Manager.io has its own sequencing for Inventory Transfers
- **Impact**: PTN numbers in app (PTN-2026-0001) may not match Manager.io transfer references
- **Workaround**: Store both; cross-reference via `PTN Number` custom field

## Application Architecture Limitations

### 1. Single Business Support
- **Current**: Hardcoded to work with one business (KEEL)
- **Future**: Multi-business support via business selection at launch

### 2. Offline-First Not Implemented
- **Current**: Requires Manager.io connection for master data
- **Impact**: Cannot work fully offline
- **Future**: IndexedDB caching with sync queue

### 3. No Real-time Collaboration
- **Current**: No WebSocket support for concurrent users
- **Impact**: Multiple users may overwrite each other's changes
- **Workaround**: Optimistic locking with version numbers; last-write-wins with audit

### 4. Limited Report Export
- **Current**: CSV/Excel export via frontend only
- **Impact**: Large reports may timeout in browser
- **Future**: Server-side report generation with streaming

### 5. Image/Photo Storage
- **Current**: Photo URLs stored as strings (external hosting needed)
- **Impact**: No integrated image upload
- **Future**: Object storage (S3/MinIO) integration

### 6. Multi-language Support
- **Current**: English only (with PKR currency formatting)
- **Future**: i18n framework for Urdu/local languages

## Business Logic Limitations

### 1. Costing Approximations
- **Issue**: Employee cost allocation uses simplified methods
- **Impact**: Hour-based vs production-based may not reflect true cost
- **Future**: Activity-based costing with detailed time tracking

### 2. Rework Payment Rules
- **Issue**: Only three payment eligibility options
- **Impact**: Complex vendor agreements may not fit
- **Future**: Configurable rules engine per vendor/item/operation

### 3. Capacity Planning
- **Current**: Simple PPH × Hours calculation
- **Impact**: Doesn't account for setup time, changeovers, efficiency factors
- **Future**: OEE-based capacity with availability/performance/quality factors

### 4. Vendor Performance Metrics
- **Current**: Basic outstanding quantity and earnings
- **Impact**: No on-time delivery, quality trend, capacity utilization
- **Future**: Vendor scorecard with SLA tracking

### 5. Batch/Serial Tracking
- **Current**: Quantity-only tracking (no individual piece traceability)
- **Impact**: Cannot trace specific piece through all operations
- **Future**: Optional lot/serial tracking for critical items

## Technical Debt

### 1. localStorage as Primary Store
- **Issue**: Operational data stored in localStorage (frontend)
- **Risk**: Data loss on browser clear, no multi-device sync
- **Status**: Temporary - will be replaced by PostgreSQL backend

### 2. Inventory Engine in Frontend
- **Issue**: Business logic (inventoryEngine.ts) runs in browser
- **Risk**: Can be bypassed; not authoritative
- **Status**: Will move to backend proxy

### 3. No Database Migrations in Frontend
- **Issue**: localStorage schema changes require manual reset
- **Workaround**: `resetToFactoryDefaults()` function
- **Future**: Proper migration system in backend

### 4. TypeScript Types Duplicated
- **Issue**: Types defined in both frontend (`src/types`) and proxy (`proxy/src/types`)
- **Future**: Shared types package or code generation from OpenAPI

### 5. Validation Only in Frontend
- **Issue**: Zod schemas only in frontend
- **Risk**: Invalid data could reach backend
- **Future**: Shared validation schemas

## Performance Considerations

### 1. Large Dataset Handling
- **Issue**: 1700+ inventory items, 70 workstations, 3 shifts
- **Impact**: Initial load fetches all master data
- **Optimization**: Pagination, lazy loading, selective sync

### 2. Report Generation
- **Issue**: 25 reports with multiple filters
- **Impact**: Complex queries may be slow
- **Optimization**: Materialized views, caching, background generation

### 3. QR Code Generation
- **Issue**: Generated on-demand in browser
- **Impact**: Slow for bulk printing
- **Optimization**: Batch generation, caching

## Security Considerations

### 1. JWT in localStorage
- **Issue**: JWT stored in localStorage (XSS vulnerable)
- **Mitigation**: HttpOnly cookie preferred but requires same-domain
- **Future**: Move to secure cookie when proxy on same domain

### 2. No MFA
- **Issue**: Single-factor authentication via Custom Button
- **Future**: Integration with Manager.io user auth if available

### 3. Audit Log Completeness
- **Issue**: Frontend audit logs can be tampered
- **Mitigation**: Backend audit logs are authoritative
- **Future**: Immutable audit log (append-only table)

## Deployment Limitations

### 1. GitHub Pages HTTPS Only
- **Issue**: GitHub Pages forces HTTPS
- **Impact**: Proxy must also be HTTPS (Let's Encrypt)
- **Status**: Configured in DEPLOYMENT.md

### 2. No Custom Domain for Proxy in Free Tier
- **Issue**: Need own domain for proxy SSL
- **Workaround**: Use subdomain of main domain

### 3. Database on Same Server
- **Issue**: PostgreSQL on same VPS as proxy (single point of failure)
- **Future**: Managed PostgreSQL (Neon, Supabase, RDS)

### 4. No Automated E2E Tests (Pending Infrastructure)
- **Issue**: Playwright configured but no browser/test infra
- **Status**: Unit tests cover auth, validation, config (22 tests, all passing)
- **Future**: Add Playwright when VPS is provisioned

## Future Enhancement Priorities

### High Priority (Next Sprint)
1. Verify Custom Button context passing in Manager.io
2. Move inventory engine to backend proxy
3. Replace localStorage with PostgreSQL
4. Add optimistic locking for concurrent edits

### Medium Priority
1. Multi-business support
2. Server-side report generation
3. Image upload for QC photos
4. Vendor scorecard dashboard

### Low Priority
1. Offline mode with sync queue
2. Multi-language support
3. Lot/serial tracking
4. Advanced costing methods
5. WebSocket real-time updates

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-31 | Backend proxy pattern | Manager.io CORS + API key security |
| 2026-10-31 | PostgreSQL for operational data | Manager.io cannot represent WOs, QC, Rework |
| 2026-10-31 | GitHub Pages for frontend | Free, reliable, integrates with CI/CD |
| 2026-10-31 | localStorage as temporary store | Faster development, will migrate to PG |
| 2026-10-31 | JWT auth with 8h expiry | Balance security vs UX for shift work |

---

**Last Updated**: 2026-11-01
**Review Frequency**: Each sprint retrospective