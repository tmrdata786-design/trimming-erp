# Database Schema (PostgreSQL)

## Overview
Operational records that Manager.io cannot represent natively are stored in PostgreSQL. The schema uses UUID primary keys, foreign keys to Manager.io record keys (stored as TEXT), and JSONB for flexible nested data.

## Tables

### 1. work_orders
```sql
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number VARCHAR(20) NOT NULL UNIQUE,  -- WO-YYYY-NNNN
    date DATE NOT NULL,
    shift_id VARCHAR(20) NOT NULL,                   -- SHIFT_A, SHIFT_B, SHIFT_C
    workstation_id VARCHAR(20) NOT NULL,             -- WS-01..WS-70
    assigned_worker_id TEXT NOT NULL,                -- Manager.io supplier/employee key
    item_id TEXT NOT NULL,                           -- Manager.io inventory item key
    stage_name VARCHAR(100) NOT NULL,
    source_ptn_id TEXT,                              -- Manager.io inventory transfer key
    quantity_issued INTEGER NOT NULL DEFAULT 0,
    planned_quantity INTEGER NOT NULL DEFAULT 0,
    actual_trimmed_quantity INTEGER NOT NULL DEFAULT 0,
    quantity_sent_to_qc INTEGER NOT NULL DEFAULT 0,
    quantity_returned_untrimmed INTEGER NOT NULL DEFAULT 0,
    closing_balance INTEGER NOT NULL DEFAULT 0,
    downtime_minutes INTEGER NOT NULL DEFAULT 0,
    delay_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, closed, reconciled
    supervisor_notes TEXT,
    verified_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_orders_date ON work_orders(date);
CREATE INDEX idx_work_orders_workstation ON work_orders(workstation_id);
CREATE INDEX idx_work_orders_worker ON work_orders(assigned_worker_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
```

### 2. qc_inspections
```sql
CREATE TABLE qc_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number VARCHAR(20) NOT NULL UNIQUE,   -- QC-YYYY-NNNN
    date TIMESTAMPTZ NOT NULL,
    reference_type VARCHAR(20) NOT NULL,             -- work_order, igp, rework_order
    reference_id UUID NOT NULL,                      -- FK to respective table
    item_id TEXT NOT NULL,                           -- Manager.io inventory item key
    quantity_inspected INTEGER NOT NULL,
    quantity_accepted INTEGER NOT NULL,
    quantity_rejected INTEGER NOT NULL,
    defects JSONB NOT NULL DEFAULT '[]',             -- [{defectType, count}]
    inspector TEXT NOT NULL,
    approved_by TEXT,
    destination_location_id TEXT NOT NULL,           -- Manager.io location key
    photo_urls JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_qc_balance CHECK (quantity_inspected = quantity_accepted + quantity_rejected)
);

CREATE INDEX idx_qc_inspections_date ON qc_inspections(date);
CREATE INDEX idx_qc_inspections_reference ON qc_inspections(reference_type, reference_id);
CREATE INDEX idx_qc_inspections_item ON qc_inspections(item_id);
```

### 3. rework_orders
```sql
CREATE TABLE rework_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rework_order_number VARCHAR(20) NOT NULL UNIQUE, -- RW-YYYY-NNNN
    original_reference_type VARCHAR(20) NOT NULL,    -- work_order, igp
    original_reference_id UUID NOT NULL,
    qc_inspection_id UUID NOT NULL REFERENCES qc_inspections(id),
    item_id TEXT NOT NULL,                           -- Manager.io inventory item key
    quantity_to_rework INTEGER NOT NULL,
    assigned_worker_type VARCHAR(20) NOT NULL,       -- employee, in_house_vendor, outsourced_vendor
    assigned_worker_id TEXT NOT NULL,                -- Manager.io key
    payment_eligibility VARCHAR(20) NOT NULL,        -- unpaid, standard_rate, special_approved_rate
    approved_rate_pkr DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_completed INTEGER NOT NULL DEFAULT 0,
    subsequent_qc_id UUID REFERENCES qc_inspections(id),
    cycle_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'assigned',  -- assigned, in_rework, completed, scrapped
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rework_orders_original ON rework_orders(original_reference_type, original_reference_id);
CREATE INDEX idx_rework_orders_qc ON rework_orders(qc_inspection_id);
CREATE INDEX idx_rework_orders_assigned ON rework_orders(assigned_worker_type, assigned_worker_id);
```

### 4. ogp_documents (Outward Gate Pass)
```sql
CREATE TABLE ogp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogp_number VARCHAR(20) NOT NULL UNIQUE,          -- OGP-YYYY-NNNN
    custom_number VARCHAR(50),
    issue_date DATE NOT NULL,
    vendor_id TEXT NOT NULL,                         -- Manager.io supplier key
    items JSONB NOT NULL DEFAULT '[]',               -- [{itemId, quantity, ratePerPiece, returnedQuantity, qcApprovedQuantity, rejectedQuantity, reworkQuantity}]
    total_issued_quantity INTEGER NOT NULL DEFAULT 0,
    expected_return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'issued',    -- issued, partially_returned, completed, cancelled
    prepared_by TEXT NOT NULL,
    approved_by TEXT,
    remarks TEXT,
    manager_transfer_key TEXT,                       -- Manager.io inventory transfer key (outbound)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ogp_vendor ON ogp_documents(vendor_id);
CREATE INDEX idx_ogp_status ON ogp_documents(status);
```

### 5. igp_documents (Inward Gate Pass)
```sql
CREATE TABLE igp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igp_number VARCHAR(20) NOT NULL UNIQUE,          -- IGP-YYYY-NNNN
    custom_number VARCHAR(50),
    ogp_id UUID NOT NULL REFERENCES ogp_documents(id),
    vendor_id TEXT NOT NULL,                         -- Manager.io supplier key
    return_date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',               -- [{itemId, quantityReturned, qcStatus, acceptedQuantity, rejectedQuantity}]
    total_returned_quantity INTEGER NOT NULL DEFAULT 0,
    receiving_location_id TEXT NOT NULL,             -- Manager.io location key
    status VARCHAR(20) NOT NULL DEFAULT 'received',  -- received, qc_in_progress, closed
    received_by TEXT NOT NULL,
    remarks TEXT,
    manager_transfer_key TEXT,                       -- Manager.io inventory transfer key (inbound)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_igp_ogp ON igp_documents(ogp_id);
CREATE INDEX idx_igp_vendor ON igp_documents(vendor_id);
```

### 6. vendor_earnings
```sql
CREATE TABLE vendor_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id TEXT NOT NULL,                         -- Manager.io supplier key
    vendor_type VARCHAR(20) NOT NULL,                -- in_house_vendor, outsourced_vendor
    reference_type VARCHAR(20) NOT NULL,             -- work_order, igp, rework_order
    reference_id UUID NOT NULL,
    item_id TEXT NOT NULL,                           -- Manager.io inventory item key
    quantity_eligible INTEGER NOT NULL,
    rate_per_piece DECIMAL(10,2) NOT NULL,
    amount_pkr DECIMAL(12,2) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by TEXT,
    approval_date DATE,
    payment_batch_id UUID REFERENCES vendor_payments(id),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_earnings_vendor ON vendor_earnings(vendor_id, vendor_type);
CREATE INDEX idx_vendor_earnings_reference ON vendor_earnings(reference_type, reference_id);
CREATE INDEX idx_vendor_earnings_approval ON vendor_earnings(is_approved, is_paid);
```

### 7. vendor_payments
```sql
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(20) NOT NULL UNIQUE,        -- PAY-YYYY-NNNN
    vendor_id TEXT NOT NULL,
    vendor_type VARCHAR(20) NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid_pkr DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,             -- cash, bank_transfer, cheque
    reference_number VARCHAR(100),
    notes TEXT,
    approved_by TEXT NOT NULL,
    earning_ids UUID[] NOT NULL DEFAULT '{}',        -- Array of vendor_earnings.id
    manager_payment_key TEXT,                        -- Manager.io supplier payment key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id, vendor_type);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date);
```

### 8. employee_costing
```sql
CREATE TABLE employee_costing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,                       -- Manager.io employee key
    month VARCHAR(7) NOT NULL,                       -- YYYY-MM
    monthly_salary_pkr DECIMAL(12,2) NOT NULL,
    allocation_method VARCHAR(20) NOT NULL,          -- hour_based, production_based, hybrid
    total_shift_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    productive_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    downtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    allocated_cost_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
    accepted_pieces_produced INTEGER NOT NULL DEFAULT 0,
    effective_cost_per_piece_pkr DECIMAL(10,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, month)
);

CREATE INDEX idx_employee_costing_month ON employee_costing(month);
```

### 9. stocktaking_sessions
```sql
CREATE TABLE stocktaking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(20) NOT NULL UNIQUE,        -- ST-YYYY-MM
    count_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',     -- draft, frozen, counting, reconciled, closed
    is_blind_count BOOLEAN NOT NULL DEFAULT TRUE,
    total_items_counted INTEGER NOT NULL DEFAULT 0,
    total_variance_quantity INTEGER NOT NULL DEFAULT 0,
    total_variance_value_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
    conducted_by TEXT NOT NULL,
    approved_by TEXT,
    notes TEXT,
    manager_count_key TEXT,                          -- Manager.io inventory count key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stocktaking_date ON stocktaking_sessions(count_date);
```

### 10. stock_count_lines
```sql
CREATE TABLE stock_count_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES stocktaking_sessions(id) ON DELETE CASCADE,
    location_id TEXT NOT NULL,                       -- Manager.io location key
    location_name TEXT NOT NULL,
    item_id TEXT NOT NULL,                           -- Manager.io item key
    item_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,                     -- untrimmed, in_trimming, qc_pending, rework_holding, approved_finished, scrapped
    book_quantity INTEGER NOT NULL DEFAULT 0,
    physical_count INTEGER NOT NULL DEFAULT 0,
    variance_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost_pkr DECIMAL(10,2) NOT NULL DEFAULT 0,
    variance_value_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
    investigation_notes TEXT,
    adjustment_posted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_count_session ON stock_count_lines(session_id);
CREATE INDEX idx_stock_count_location_item ON stock_count_lines(location_id, item_id);
```

### 11. audit_events
```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_events(user_id);
```

### 12. master_data_cache (for offline/sync)
```sql
CREATE TABLE master_data_cache (
    entity_type VARCHAR(50) NOT NULL,                -- items, locations, suppliers, employees
    manager_key TEXT NOT NULL,                       -- Manager.io UUID
    data JSONB NOT NULL,                             -- Full record with custom fields
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, manager_key)
);

CREATE INDEX idx_master_cache_synced ON master_data_cache(synced_at);
```

### 13. app_config (application settings)
```sql
CREATE TABLE app_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default configs:
-- workstations: ["WS-01", "WS-02", ..., "WS-70"]
-- shifts: [{"id": "SHIFT_A", "name": "Shift A", "start": "07:00", "end": "15:30", "break": 60, "netHours": 7.5}, ...]
-- defectTypes: ["flash_excess", "over_trim_gouge", "short_mould", "sink_mark", "parting_line", "other"]
-- reworkRules: ["unpaid_original", "standard_rate", "supervisor_decision"]
-- trimmingItemTypes: ["untrimmed_molding", "intermediate", "trimmed_finished"]
-- vendorCategories: ["in_house_vendor", "outsourced_vendor"]
```

## Migration Strategy

1. **Initial Migration:** Run schema creation on first proxy startup
2. **Versioning:** Use simple migration files (001_initial.sql, 002_add_index.sql, etc.)
3. **Rollback:** Each migration has down() function
4. **Seeding:** Insert default workstations, shifts, defect types, config on first run

## Connection Pooling

```typescript
// pg pool config
{
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}
```

## Backup Strategy

- **Daily:** `pg_dump` to compressed file, uploaded to S3/compatible storage
- **Point-in-time:** WAL archiving (if using managed PG)
- **Export:** JSON backup via `/api/admin/backup` endpoint (for migration)