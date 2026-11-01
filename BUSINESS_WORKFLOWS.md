# Business Workflows

This document describes the core manufacturing workflows implemented in the Trimming ERP application and their integration with Manager.io.

## 1. Master Data Management

### Items
- **Untrimmed Items (MLD-xxx)**: Raw moulded parts received from molding department
- **Trimmed Items (TRM-xxx)**: Finished parts after trimming operations
- **Parent-Child Relationship**: Each TRM item linked to its MLD parent via `Parent Item Code` custom field
- **Custom Fields**: Expected Capacity (PPH), Default Trimming Rate (PKR), QC Required, Rework Rule, Trimming Item Type, Workstation Affinity

### Locations
- Hierarchical: Company → Department → Store → Rack → Shelf/Bin
- 13 custom inventory locations created in Manager.io
- No custom fields on locations (Manager.io limitation)

### Suppliers (Vendors)
- **In-House Piece-Rate Vendors**: Internal contractors paid per piece
- **Outsourced Vendors**: External companies with workforce
- **Custom Fields**: Vendor Category, Workforce Count, Available Daily Hours, Default Piece Rate, Assigned Workstation, Default Shift

### Employees
- Salaried staff for cost allocation only (no payroll transactions)
- **Custom Fields**: Assigned Workstation, Default Shift, Monthly Salary (PKR)

## 2. Production Transfer Notes (PTN)

### Flow
```
Molding Bay → Raw Store (Rack/Shelf) → Workstation (WS-01..70) → QC Holding → 
  ├─ Accepted → Finished Store → Packing → Dispatch
  └─ Rejected → Rework Holding → Rework Order → QC Holding (re-inspect)
```

### PTN Process
1. **Create PTN**: Multi-item transfer with source/destination locations, workstation, assigned person
2. **Approval Gate**: Auto-approve for routine transfers; supervisor approval for large/cross-department
3. **Post PTN**: Creates Manager.io Inventory Transfer with custom fields (PTN Number, Workstation, Assigned Worker, Production Stage, Work Order Ref, QR Payload)
4. **Stock Update**: Manager.io updates stock balances automatically

### Business Rules
- Every internal movement requires PTN
- PTN validates available stock at source (prevents negative stock)
- QR code generated for floor scanning
- Printable PTN document for physical signature

## 3. Production Planning & Work Orders

### Shift Planning
- 3 shifts: A (07:00-15:30), B (15:30-23:30), C (23:30-07:00)
- 70 workstations (WS-01..70) with capacity multipliers
- Target calculation: `Expected Capacity (PPH) × Net Working Hours`
- Stock reservation prevents over-allocation

### Work Order Lifecycle
1. **Scheduled**: Created from planning, linked to PTN for material issue
2. **In Progress**: Operator works, records hourly output
3. **Closed**: Supervisor verifies `Issued = Trimmed + Returned + Closing Balance`
4. **Reconciled**: All quantities accounted, costs allocated

### Shift Closing Reconciliation
```
Invariant: Quantity Issued = Actual Trimmed + Returned Untrimmed + Workstation Closing Balance
```

### Output
- Trimmed pieces → QC Holding (via Inventory Transfer)
- Untrimmed returns → Raw Store (via Inventory Transfer)
- Closing balance stays at workstation location

## 4. Outsourced Production (OGP/IGP)

### Outward Gate Pass (OGP)
- Issue untrimmed parts to outsourced vendor
- Multiple items per OGP with individual rates
- Creates Manager.io Inventory Transfer to Vendor Site location
- Tracks: Expected return date, piece rates, total quantity

### Inward Gate Pass (IGP)
- Receive returned parts from vendor (partial returns supported)
- Links to original OGP
- Creates Manager.io Inventory Transfer from Vendor Site to QC Holding
- Updates vendor outstanding quantity

### Vendor Outstanding Tracking
- Real-time balance: `Issued - Returned = Outstanding`
- Per-item tracking within OGP
- Multiple partial IGPs against single OGP

## 5. Quality Control (QC)

### Inspection Process
1. **Select Reference**: Work Order, IGP, or Rework Order
2. **Record Quantities**: Inspected = Accepted + Rejected (enforced)
3. **Classify Defects**: Flash Excess, Over-Trim Gouge, Short Mould, Sink Mark, Parting Line, Other
4. **Disposition**: 
   - Accepted → Finished Store (Inventory Transfer)
   - Rejected → Rework Holding (Inventory Transfer)
5. **Approval**: QC Lead approves, optional photo evidence

### Business Rules
- `Inspected Quantity = Accepted Quantity + Rejected Quantity` (strict invariant)
- Only authorized QC personnel can perform inspections
- Duplicate inspections prevented by reference tracking

## 6. Rework Management

### Rework Flow
```
QC Rejection → Rework Holding → Rework PTN → Rework Order → 
  Rework Completion → Re-inspection (QC) → Accepted/Scrapped
```

### Lineage Tracking
- Each rework order links to: Original WO/IGP, QC Rejection, Rework PTN
- Cycle number tracks 1st, 2nd, 3rd rework
- Original worker, rework assignee, payment eligibility all tracked

### Payment Eligibility
- **Unpaid Original**: Operator error, no additional pay
- **Standard Rate**: Normal rework rate (configurable)
- **Supervisor Decision**: Special approval for raw material defects

## 7. Vendor Earnings & Payments

### In-House Vendors
- Earnings auto-calculated from QC-accepted quantities × piece rate
- Created when QC inspection completes for work orders
- Requires supervisor approval before payment

### Outsourced Vendors
- Earnings from IGP accepted quantities × OGP piece rate
- Partial returns create partial earnings
- Payment batches with bank references

### Payment Controls
- Approval required before payment creation
- Duplicate payment prevention (earnings marked paid)
- Manager.io Supplier Payment created for each batch

## 8. Employee Labour Costing

### Allocation Methods
1. **Hour-Based**: Monthly salary / Available hours × Productive hours
2. **Production-Based**: Monthly salary / Accepted pieces × Cost per piece
3. **Hybrid**: Productive hours, downtime, rework time separated

### Cost Posting
- Monthly journal entry in Manager.io: Debit WIP/COGS, Credit Labour Expense
- No employee payable created (salary paid separately)
- Cost per accepted piece calculated for product costing

## 9. Product Costing

### Cost Components
```
Finished Cost/Unit = Baseline Manufacturing Cost
                   + In-House Trimming Cost
                   + Outsourced Trimming Cost
                   + Allocated Employee Labour Cost
                   + Rework/Scrap Cost Allocation
```

### Cost Sources
- Baseline: Manager.io Purchase Price on MLD item
- In-House: Vendor earnings / accepted pieces
- Outsourced: OGP rates / IGP accepted pieces
- Employee: Monthly costing allocation / accepted pieces
- Rework: Rework costs / accepted pieces

## 10. Monthly Stocktaking

### Process
1. **Session Creation**: Freeze book quantities snapshot
2. **Blind Count**: Floor teams count without seeing system quantities
3. **Variance Analysis**: Physical vs Book in units and PKR
4. **Investigation**: Document reasons for variances
5. **Approval**: Manager approves adjustments
6. **Adjustment**: Manager.io Inventory Write-off/Receipt created

### Reconciliation Report
- Previous Closing
- Opening Balance
- Receipts (Molding, Returns, Adjustments)
- Issues (PTN, OGP, Write-offs)
- Transfers (Internal, QC, Rework)
- Expected Closing
- Physical Closing
- Variance (Qty & Value)

## 11. Reporting & Analytics

### 25 Standard Reports
1. Current Stock by Item/Location/Status
2. Stock Held by Employee/Vendor
3. Daily Molding Receipts
4. PTN History
5. OGP/IGP History
6. Outstanding Outsourced Stock
7. Work Orders in Progress
8. Planned vs Actual Production
9. Production Efficiency by Workstation
10. Production by Employee/Shift
11. In-House Vendor Production
12. Outsourced Vendor Performance
13. Hourly Production Performance
14. Delay Duration & Reasons
15. QC Acceptance/Rejection
16. Rework Quantities & Outcomes
17. First-Pass Quality Rate
18. Repeated QC Rejection
19. Vendor Earnings & Payments
20. Outstanding Vendor Balances
21. Employee Labour Cost Allocation
22. Item-wise Production Cost
23. Cost History
24. Monthly Stock-count Variances
25. Inventory Adjustments & Approvals

### KPI Dashboard
- Production Attainment: `Actual Trimmed / Planned × 100`
- First-Pass Quality Rate: `1st Pass Accepted / Inspected × 100`
- Good-Output Efficiency: `QC Accepted / Planned × 100`
- Workstation OEE
- Vendor Payable Balances