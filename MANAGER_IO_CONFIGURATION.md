# Manager.io Configuration Audit

**Server:** `https://promoerp.promoerp.it/` (API: `http://promoerp.promoerp.it/api2`)
**Business:** KEEL (to be confirmed)
**API Version:** 26.8.4.3664 (from MCP check)

---

## Custom Fields — Already Created

### Checkbox Custom Fields
| Name | Placement | Notes |
|------|-----------|-------|
| QC Required | Inventory Item | Used for QC enforcement |

### Number Custom Fields
| Name | Placement | Notes |
|------|-----------|-------|
| Available Daily Hours | Supplier | Outsourced vendor capacity |
| Default Piece Rate (PKR) | Supplier | Vendor piece rate |
| Default Trimming Rate (PKR) | Inventory Item | Financial rate per piece |
| Expected Capacity (PPH) | Inventory Item | Production capacity pieces/hour |
| Monthly Salary (PKR) | Employee | For cost allocation only |
| Workforce Count | Supplier | Outsourced vendor headcount |

### Text Custom Fields
| Name | Placement | Current Type | Suggested Conversion |
|------|-----------|--------------|---------------------|
| Assigned Worker | Inventory Transfer | Text | Keep as text (worker name) |
| Assigned Workstation | Supplier, Employee | Text | Keep as text (WS-01..WS-70) |
| Barcode | Inventory Item | Text | Keep as text |
| Default Shift | Supplier, Employee | Text | **Convert to Dropdown** (Shift A/B/C) |
| Parent Item Code | Inventory Item | Text | Keep as text (MLD-001 format) |
| Production Stage | Inventory Transfer | Text | **Convert to Dropdown** (stage names) |
| PTN Number | Inventory Transfer | Text | Keep as text (PTN-YYYY-NNNN) |
| QR Payload | Inventory Transfer | Text | Keep as text (JSON) |
| Rework Rule | Inventory Item | Text | **Convert to Dropdown** (Unpaid Original / Standard Rate / Supervisor Decision) |
| Trimming Item Type | Inventory Item | Text | **Convert to Dropdown** (Untrimmed Moulding / Intermediate / Trimmed Finished) |
| Vendor Category | Supplier | Text | **Convert to Dropdown** (In-House Piece-Rate / Outsourced) |
| Work Order Ref | Inventory Transfer | Text | Keep as text (WO-YYYY-NNNN) |
| Workstation | Inventory Transfer | Text | Keep as text (WS-01..WS-70) |
| Workstation Affinity | Inventory Item | Text | Keep as text (comma-separated WS codes) |

**Action Required:** Convert 4 text fields to dropdown for data integrity. This requires creating new dropdown fields and migrating data.

---

## Inventory Locations — Already Created

Custom inventory locations (13):
- Bin Number
- Dispatch Bay
- Finished Store
- Molding Bay
- Packing Bay
- QC Holding
- QC Rejected
- Rack Number
- Raw Store
- Rework Holding
- Shelf Number
- Vendor Site
- Workstation

**Hierarchy:** Already configured. Manager.io location records are the authoritative source.

---

## Custom Buttons — Already Created (8)

| Button | Likely Placement | Expected Behavior |
|--------|------------------|-------------------|
| Create PTN | Inventory Item / Location | Open PTN creation with context |
| Create Work Order | Inventory Item / Workstation | Open WO creation with context |
| Open Trimming ERP | Global / Main Menu | Launch main application |
| QC Inspection | Inventory Item / Location | Open QC inspection with context |
| Scan QR/Barcode | Global | Open scanner modal |
| Vendor IGP | Supplier (Outsourced) | Open IGP creation for vendor |
| Vendor OGP | Supplier (Outsourced) | Open OGP creation for vendor |
| View Stock Balance | Inventory Item | Open stock balance view for item |

**Need to Verify:** Actual URL format, parameter passing mechanism, iframe vs new tab, context variables.

---

## Integration Architecture Decision

**Confirmed:** Backend proxy required. GitHub Pages frontend cannot directly call Manager.io API (CORS, API key exposure).

**Architecture:**
```
GitHub Pages (Frontend) → HTTPS → Backend Proxy (Express + PostgreSQL) → Manager.io API
                                    ↑
                              API Key stored here only
```

**Proxy Responsibilities:**
- Authenticate frontend requests (JWT/session)
- Validate user roles/permissions
- Proxy API calls to Manager.io with X-API-KEY
- Store operational records (Work Orders, QC, Rework, OGP/IGP, Vendor Earnings, Costing)
- Sync master data from Manager.io
- Audit logging

---

## Missing Custom Fields (from original plan)

The following fields from the original plan are NOT yet created:
- Location Type on Inventory Location (Manager.io doesn't support custom fields on locations)
- Rack/Shelf/Bin Number on Inventory Location (use existing custom inventory locations instead)
- Approval limits on Users (not supported)

**Decision:** Use application-level configuration mapping for location types instead of custom fields.

---

## Next Steps

1. Verify dropdown field conversions (4 fields)
2. Document Custom Button URL formats and parameter passing
3. Build backend proxy service
4. Implement master data synchronization
5. Replace localStorage with Manager.io + PostgreSQL