# TRIMMING PRODUCTION, INVENTORY, QUALITY CONTROL & COST MANAGEMENT SYSTEM
## Comprehensive End-User Operations Manual & Standard Operating Procedures (SOP)

---

## 1. System Introduction & Operational Purpose

The **Trimming Production, Inventory, Quality Control & Cost Management System** is a real-time, transaction-based manufacturing management system designed specifically for plastic moulding and component trimming plants.

Unlike generic spreadsheets or standalone accounting software, this application functions as a **closed-loop operations engine**. Every physical movement of plastic parts—from raw moulding reception to workstation de-burring, outsourced contractor processing, quality inspection, rework correction, packing, and dispatch—must be authorized by an explicit, auditable document.

### Primary Objectives of the System
1. **Zero Material Loss**: Eliminate unrecorded physical material movements across floors, racks, and vendor sites.
2. **Shift Material Balance**: Enforce shift-end material reconciliation so that every issued moulding is strictly accounted for.
3. **Defect Quarantine**: Guarantee that uninspected or rejected parts never enter finished stock.
4. **Fair Piece-Rate Settlement**: Automatically calculate piece-rate earnings in Pakistani Rupees (**PKR / Rs.**) strictly based on **QC-approved good pieces**.
5. **Accurate Product Costing**: Combine raw moulding baseline costs, vendor trimming rates, absorbed employee salaries, and rework scrap into a true, finished unit cost.

---

## 2. Core Operating Principles & Business Logics

To use the system effectively, every operator, supervisor, and manager must understand the operational logic governing each module.

### A. The Double-Entry Stock Movement Law
The system treats physical inventory like money in a double-entry accounting ledger. 
- You can never "change" a stock number by typing over it.
- To increase stock in Location B, it must be decremented from Location A via a validated transaction.
- **Negative Stock Prevention**: The system strictly prevents issuing or transferring more material than currently exists on-hand in a location.

### B. Production Transfer Notes (PTN) as Legal Floor Permits
No material is allowed to move between departments or workstations without a **Production Transfer Note (PTN)**.
- Moving parts from the **Moulding Bay** to the **Raw Store** requires a PTN.
- Moving parts from the **Raw Store** to **Workstation WS-12** requires a PTN.
- Returning unworked parts at shift end requires a PTN or shift closing return.

### C. Pieces Per Hour (PPH) vs. Trimming Piece Rate (PKR)
A fundamental rule in the system is that **production capacity** and **financial piece rate** are two completely distinct concepts:
- **Expected Production Capacity (PPH)**: A physical speed metric (e.g., *120 pieces per hour*).
- **Trimming Rate (PKR)**: A financial compensation metric (e.g., *Rs. 2.50 per piece*).
The system never confuses these values. Capacity calculates planned targets; piece rates calculate financial liabilities.

### D. The Shift Balance Reconciliation Invariant
At the end of every working shift (Shift A, Shift B, or Shift C), the supervisor must close the work order through the **Shift Digitizer**. The system mathematically verifies:
$$\text{Quantity Issued} \equiv \text{Actual Trimmed} + \text{Untrimmed Returned} + \text{Workstation In-Process Balance}$$
If the sum does not equal the issued quantity, the system **blocks shift closing** and flags the exact discrepancy quantity.

### E. Quality Control (QC) Invariant
Every inspection must satisfy the completeness rule:
$$\text{Inspected Quantity} \equiv \text{Accepted Quantity} + \text{Rejected Quantity}$$
- **Accepted Pieces**: Automatically transfer from `QC Holding` to `Approved Finished Store`.
- **Rejected Pieces**: Automatically transfer from `QC Holding` to `Rework Staging Bay`.

### F. Vendor Earnings vs. Payment Disbursements (Anti-Double Counting)
- **Earning Recognition**: When QC accepts trimmed parts, a financial credit is recorded in the vendor's earnings ledger.
- **Payment Settlement**: When the accounts department issues a payment voucher (cash, cheque, or bank transfer), it settles previously recognized earnings. **It does not create a new production expense**. This eliminates double-counting of costs.

### G. Employee Labour Costing Boundary
Salaried floor employees receive fixed monthly salaries through corporate payroll. To avoid duplicate debt:
- Employee salary records in this application are used **strictly for overhead absorption per piece**.
- The system **never creates vendor payable obligations or payment vouchers for salaried employees**.

---

## 3. User Roles & Standard Operating Procedures (SOP)

The system provides 7 pre-configured operational roles. You can switch your active role using the **Operational Role** dropdown in the left sidebar.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OPERATIONAL ROLES                             │
│                                                                        │
│  1. Store Operator        ──► Receipts, Issues, PTNs, OGPs, IGPs       │
│  2. Production Planner    ──► Target Scheduling, Capacity, PTN Issue   │
│  3. Production Supervisor ──► Shift Digitizer, Material Reconciliation │
│  4. QC Inspector          ──► Defect Classification, Accept/Reject    │
│  5. Accounts & Costing    ──► Earnings Approvals, Payments, Unit Costs │
│  6. Plant Manager         ──► Discrepancy Authorizations, Audits       │
│  7. System Administrator  ──► Fleet Config, Master Items, Racks        │
└────────────────────────────────────────────────────────────────────────┘
```

### Role 1: Store Operator / Warehouse Clerk
- **Daily Responsibilities**:
  1. Record new moulding receipts into the Raw Trimming Store using opening balance or receipt PTNs.
  2. Issue materials to workstations WS-01 through WS-70 upon receiving approved production requests.
  3. Prepare **Outward Gate Passes (OGPs)** for outsourced trimming vendors.
  4. Receive material returns from vendors using **Inward Gate Passes (IGPs)** and immediately route them to `QC Holding`.
  5. Print physical document slips and affix them to physical plastic totes or bins.

### Role 2: Production Planner
- **Daily Responsibilities**:
  1. Open the **Production Planning** module before shift handover.
  2. Select the target date, shift (A, B, or C), item code, and workstation.
  3. Verify available unreserved raw moulding inventory.
  4. Review the auto-calculated shift target ($\text{PPH} \times \text{Net Shift Hours}$).
  5. Confirm the plan, which automatically creates the **Shift Work Order** and initiates the **PTN** to transfer material to the station.

### Role 3: Production Supervisor
- **Daily Responsibilities**:
  1. Monitor active floor progress on the **70 Workstations Fleet Matrix**.
  2. Print the **Daily Paper Shift Job Sheet** for operators to record hourly counts and machine downtime.
  3. At shift changeover, collect physical paper sheets and open the **Shift Digitizer UI**.
  4. Input actual trimmed output, untrimmed material returned to store, and unworked material left at the station.
  5. Resolve any discrepancies until the material balance shows $\Delta = 0$.

### Role 4: Quality Control (QC) Inspector
- **Daily Responsibilities**:
  1. Check the **QC Holding Staging Queue** for incoming batches.
  2. Select the batch (Internal Work Order or Vendor IGP).
  3. Conduct visual and dimensional inspection.
  4. Enter total inspected quantity, accepted quantity, and rejected quantity.
  5. Tag specific defect causes (Flash excess, over-trim gouge, sink marks, parting line defects).
  6. Authorize release: Good pieces flow to finished stock; rejects flow to rework holding.

### Role 5: Accounts User & Cost Accountant
- **Daily Responsibilities**:
  1. Access the **Vendor Piece-Rate Settlement** module.
  2. Review earned credits generated from QC-approved batches.
  3. Authorize eligible earnings for in-house vendors and outsourced contractors.
  4. Process **Payment Vouchers (PKR)** against approved earnings.
  5. Review monthly employee salary absorption in the **Employee Labour Cost** module.
  6. Analyze finished component cost breakdowns in the **Product Costing** screen.

### Role 6: Plant Manager / Approver
- **Daily Responsibilities**:
  1. Monitor real-time plant KPIs (Production Attainment, FPQR, Good-Output Efficiency).
  2. Investigate material discrepancies during **Monthly Stocktaking**.
  3. Authorize exceptional inventory adjustments and rate overrides.
  4. Audit the tamper-evident **Audit Event Trail**.

---

## 4. Step-by-Step Module Usage Guide

### Module 1: Operations Command Center (Dashboard)
- **Purpose**: Provides a bird's-eye view of plant health, active shifts, material distribution, and immediate floor alerts.
- **How to Use**:
  1. Click **Command Center** in the sidebar.
  2. Review the top KPI strip:
     - **Attainment**: Checks if actual trimmed volume is keeping pace with planned targets.
     - **First-Pass Quality Rate (FPQR)**: The percentage of parts accepted on first inspection without needing rework.
     - **Good-Output Efficiency**: Ratio of QC-passed parts to original planned demand.
     - **Active WS Fleet**: Visual count of how many of the 70 stations are running.
     - **Material in QC / RW**: Alert metric showing work-in-progress locked in testing or repair.
     - **Vendor Held Parts**: Total volume currently outside company premises.
  3. Check the **Mini 70-Grid**: Click any workstation box to inspect its current status.

---

### Module 2: 70 Workstations Fleet Matrix
- **Purpose**: Live monitoring and configuration of all 70 physical trimming benches (WS-01 through WS-70).
- **How to Use**:
  1. Click **70 Workstations Fleet** in the sidebar.
  2. Filter by status using the buttons: `All Stations (70)`, `Active`, `Idle`, or `Maintenance`.
  3. **To configure a station**: Click the small pencil/edit icon on any workstation card.
     - Update bench name or description.
     - Change status (e.g., mark as `Maintenance` if pneumatic cutters require blade replacement).
     - Assign an In-House Vendor or Salaried Employee to the station.
     - Adjust the **Capacity Multiplier** (e.g., `1.2x` for motorized high-speed cutters).
     - Click **Save Configuration**.
  4. **To add a new station (e.g., WS-71)**: Click **Add Workstation** at the top right, enter the code and name, and click save.

---

### Module 3: Production Planning & Scheduling
- **Purpose**: Create shift schedules and reserve raw inventory without over-allocation.
- **How to Use**:
  1. Click **Production Planning** in the sidebar.
  2. Select the **Production Date** and **Shift** (Shift A Morning, Shift B Evening, Shift C Night).
  3. Choose the target **Workstation (WS-01 to WS-70)** and the assigned **Worker/Vendor**.
  4. Pick the raw moulding item (e.g., `MLD-001 Plastic Housing A`).
  5. The system automatically computes the **Suggested Target** based on:
     $$\text{Target} = \text{Item PPH} \times \text{Net Shift Hours} \times \text{Station Multiplier}$$
     *(Example: 120 PPH $\times$ 7.5 hours = 900 pieces).*
  6. Enter the **Quantity to Issue via PTN** (e.g., 400 pieces).
  7. **Shortage Protection**: If you request more pieces than are available in unreserved raw stock, the button turns disabled, and a red alert flags the exact shortage.
  8. Click **Confirm Plan & Issue PTN to Station**.

---

### Module 4: Shift Work Orders & The Shift Digitizer
- **Purpose**: Track floor job orders, print manual shift sheets, and digitize end-of-shift material counts.
- **How to Use**:
  1. Click **Shift Work Orders** in the sidebar.
  2. To print a physical sheet for an operator: Click the **Printer icon** next to the work order.
  3. **At the end of the shift**: Click **Digitize Shift**.
  4. In the digitizer modal, enter the counts from the paper sheet:
     - **Actual Trimmed (pcs)**: Finished parts sent to QC.
     - **Untrimmed Returned (pcs)**: Unworked raw parts sent back to the raw store.
     - **Closing Balance at WS (pcs)**: Parts remaining at the bench for the next shift.
     - **Downtime Minutes & Reason**: Stoppage duration (e.g., blade change, compressor trip).
  5. Check the **Material Balance Gauge**:
     - If the sum of Trimmed + Returned + Closing equals the original Issued quantity, the gauge glows **Green (100% Balanced, $\Delta = 0$)**.
     - If numbers don't match, the gauge turns **Red**, displaying the exact discrepancy.
  6. Click **Confirm & Reconcile Shift** to finalize the order and route trimmed parts to QC.

---

### Module 5: Production Transfer Notes (PTN)
- **Purpose**: Authorize and record internal movements between stores, benches, and quarantine areas.
- **How to Use**:
  1. Click **Transfer Notes (PTN)** in the sidebar.
  2. Click **New Transfer Note (PTN)**.
  3. Select **Source Location** (e.g., `STORE-RAW`) and **Destination Location** (e.g., `WS-BAY` or `QC-HOLD`).
  4. Add material lines: Select the item, enter the quantity, and state the transfer reason.
  5. Click **Post Production Transfer Note**.
  6. Click the **Printer icon** to generate an official PTN slip with a scan-ready QR code.

---

### Module 6: Stock Balances & Movement Ledger
- **Purpose**: Real-time view of inventory on hand and complete history of all transactions.
- **How to Use**:
  1. Click **Stock Ledger & Balances** in the sidebar.
  2. **Balances Tab**: Shows current stock for every item at every rack, shelf, bench, or holding area. Filter by status (`untrimmed`, `in_trimming`, `qc_pending`, `rework_holding`, `approved_finished`).
  3. **Movement Ledger Tab**: Searchable history of every stock transaction with timestamp, transaction number (`TXN-2026-xxxxx`), source, destination, and user stamp.
  4. Click **Export Ledger** to download the ledger as a CSV spreadsheet.

---

### Module 7: Outsourced Vendors & Gate Passes (OGP / IGP)
- **Purpose**: Manage contractors who trim parts outside the factory.
- **How to Issue an Outward Gate Pass (OGP)**:
  1. Click **Outsourced (OGP / IGP)** in the sidebar.
  2. Click **Issue Outward Gate Pass (OGP)**.
  3. Select the vendor, issue date, expected return date, item, quantity, agreed piece rate (PKR), and carrier vehicle details.
  4. Click **Issue Gate Pass (OGP)**.
  5. Print the OGP document containing the authorization QR code for the security gate.
- **How to Receive Partial Returns (IGP)**:
  1. When the vendor delivers parts back, find their OGP in the list.
  2. Click **Receive IGP**.
  3. Enter the quantity physically returned today. (The system permits partial returns and prevents entering more than the remaining balance).
  4. Click **Accept Return via IGP**. Material automatically moves into `QC Holding` for inspection.

---

### Module 8: Quality Control (QC) Inspections
- **Purpose**: Inspect trimmed parts and route them into finished goods or rework.
- **How to Use**:
  1. Click **QC Inspections** in the sidebar.
  2. Click **New QC Inspection**.
  3. Select the source batch type (`Internal Shift Work Order`, `Vendor IGP`, or `Rework Order`) and enter the reference number.
  4. Select the trimmed component code (e.g., `TRM-001`).
  5. Enter the **Inspected Total**.
  6. Enter the **Accepted (Pass)** quantity. The system automatically calculates the **Rejected (Rework)** quantity.
  7. Fill in the defect causes breakdown (Flash excess, over-trim gouge, short mould, etc.).
  8. Click **Post QC Inspection & Release**.
     - Good pieces move to **Main Trimmed Finished Store**.
     - Rejects move to **Rework Staging Bay**.
     - If the batch came from a piece-rate vendor, their earnings credit in PKR is **automatically generated**.

---

### Module 9: Closed-Loop Multi-Cycle Rework
- **Purpose**: Rectify rejected parts while keeping a permanent link to the original worker and work order.
- **How to Use**:
  1. Click **Closed-Loop Rework** in the sidebar.
  2. Review the **Rework Holding Bay** queue count.
  3. Click **New Rework Order**.
  4. Enter the original Work Order / QC reference, item code, quantity, and assign a worker.
  5. **Select Payment Policy**:
     - `Unpaid Rework`: Standard for operator workmanship error.
     - `Supervisor Authorized Rate`: When rework is reassigned to another vendor or caused by bad raw moulding.
     - `Full Standard Piece Rate`: Exceptional rework rate.
  6. Click **Issue Rework Order**.
  7. When rework is finished, click **Complete & Route to QC** on that order row. Material moves back to QC Holding for re-inspection.

---

### Module 10: Vendor Settlement & Payment Ledgers (PKR)
- **Purpose**: Manage piece-rate payables in Pakistani Rupees (**₨**) and record disbursements.
- **How to Approve Earnings**:
  1. Click **Vendor Ledgers (PKR)** in the sidebar.
  2. Under the **Piece-Rate Earnings Ledger** tab, review earned credits generated from QC-approved output.
  3. Click **Approve** next to pending lines to clear them for payment.
- **How to Disburse Payments**:
  1. Click **Record Vendor Payment**.
  2. Select the vendor, payment amount in PKR, payment method (Bank Transfer, Cash, Cheque), and cheque/reference number.
  3. Click **Disburse & Clear Ledger**.
  4. The system marks all covered earnings as `PAID` and updates the outstanding balance.

---

### Module 11: Employee Labour Cost Allocation
- **Purpose**: Distribute salaried employee payroll into per-unit manufacturing costs without generating vendor payable liabilities.
- **How to Use**:
  1. Click **Employee Labour Cost** in the sidebar.
  2. View the table showing monthly salary base, standard hourly rate, shift hours worked, downtime cost, and productive cost per piece.
  3. To adjust an employee's costing base: Click **Adjust Salary**, enter the new monthly figure in PKR, and click save.
  4. Switch absorption modes via the top dropdown (`Hybrid`, `Hour-Based`, `Volume Proportional`).

---

### Module 12: Product Finished Unit Costing
- **Purpose**: Review full cost per accepted piece to evaluate profitability.
- **How to Use**:
  1. Click **Product Unit Costing** in the sidebar.
  2. Inspect the cost cards for each finished item (`TRM-001`, `TRM-002`, `TRM-003`).
  3. Each card displays:
     - **Baseline Raw Moulding Cost (PKR)**
     - **In-House Trimming Rate (PKR)**
     - **Absorbed Employee Labour Cost (PKR)**
     - **Rework & Scrap Burden (PKR)**
     - **Total Finished Product Cost (PKR)**

---

### Module 13: Monthly Physical Stocktaking & Reconciliation
- **Purpose**: Monthly inventory counts, blind count audits, and authorized variance adjustments.
- **How to Conduct Monthly Stocktaking**:
  1. Click **Monthly Stocktaking** in the sidebar.
  2. Click **New Monthly Stocktake**.
  3. Toggle **Blind Count Mode** ON if you want counters to record counts without seeing system figures.
  4. Click **Snapshot & Begin Count**. The system creates an immutable freeze of book inventory across all locations.
  5. As count sheets come in from the floor, type the physical count into the **Physical Count** column.
  6. The system highlights discrepancies:
     - Red for shortages (Physical < Book).
     - Green for overages (Physical > Book).
     - Calculates total variance value in PKR.
  7. **To adjust a discrepancy**: Click **Investigate & Adjust** on that row.
  8. Type the investigation root cause (e.g., "Tote misplaced during Shift B, verified physically"), enter the authorizer name, and click **Authorize Ledger Adjustment**. An immutable adjustment transaction is posted.

---

### Module 14: Barcode & QR Code Floor Scanner
- **Purpose**: Instant document and tag retrieval on the factory floor.
- **How to Use**:
  1. Click **Scan Floor Barcode / QR** in the sidebar or top bar.
  2. Point the device camera at any printed PTN, OGP, IGP, Work Order, Workstation label, or Item barcode.
  3. Or scan using a handheld USB barcode scanner (which types directly into the field).
  4. The modal resolves the record and provides a one-click button: **Open Document in System**.

---

### Module 15: 25 Production & Cost Reports
- **Purpose**: Comprehensive reporting for production managers, quality heads, and plant directors.
- **How to Use**:
  1. Click **25 Production Reports** in the sidebar.
  2. Select any report from the 5 catalog groups (Inventory, Production, Quality, Financials, Auditing).
  3. Filter by shift or date.
  4. Click **Export to Excel / CSV** to generate a clean, spreadsheet-ready download.

---

### Module 16: Automated Verification Test Suite
- **Purpose**: Technical and operational compliance verification.
- **How to Use**:
  1. Click **Automated Test Suite** in the sidebar.
  2. Click **Execute All 9 Business Test Scenarios** or run scenarios individually (Scenarios A through I).
  3. The engine simulates end-to-end flows and outputs green checkmarks confirming that business invariants hold true.

---

## 5. Frequently Asked Questions (FAQ)

**Q1: What happens if an operator enters more returned parts than were issued on a work order?**  
*A: The Shift Digitizer will reject the closing and display a material imbalance warning. The sum of Trimmed + Returned + Station Closing must exactly equal the Issued quantity.*

**Q2: Does recording an employee's salary generate a payment voucher in the vendor ledger?**  
*A: No. Employee salaries are strictly an overhead costing parameter. Only independent piece-rate vendors generate payment vouchers.*

**Q3: Can a vendor return material against an OGP across multiple days?**  
*A: Yes. The system supports unlimited partial Inward Gate Passes (IGPs) until the issued quantity is fully reconciled.*

**Q4: Can ordinary operators overwrite stock numbers?**  
*A: Never. All inventory numbers are mathematically derived from validated transactions. Any physical discrepancy must go through the Monthly Stocktaking and Adjustment Authorization workflow.*

**Q5: What currency is used throughout the system?**  
*A: Pakistani Rupee (**PKR / Rs. / ₨**).*
