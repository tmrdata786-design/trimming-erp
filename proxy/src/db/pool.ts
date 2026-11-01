import pg from 'pg';
import { DATABASE_URL } from '../utils/config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  return result;
}

export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

export async function initSchema(): Promise<void> {
  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // schema_migrations for tracking applied migrations
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(20) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // work_orders
  await query(`
    CREATE TABLE IF NOT EXISTS work_orders (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_order_number VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      shift_id VARCHAR(20) NOT NULL,
      workstation_id VARCHAR(20) NOT NULL,
      assigned_worker_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      stage_name VARCHAR(100) NOT NULL,
      source_ptn_id TEXT,
      quantity_issued INTEGER NOT NULL DEFAULT 0,
      planned_quantity INTEGER NOT NULL DEFAULT 0,
      actual_trimmed_quantity INTEGER NOT NULL DEFAULT 0,
      quantity_sent_to_qc INTEGER NOT NULL DEFAULT 0,
      quantity_returned_untrimmed INTEGER NOT NULL DEFAULT 0,
      closing_balance INTEGER NOT NULL DEFAULT 0,
      downtime_minutes INTEGER NOT NULL DEFAULT 0,
      delay_reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      supervisor_notes TEXT,
      verified_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, work_order_number)
    )
  `);

  // qc_inspections
  await query(`
    CREATE TABLE IF NOT EXISTS qc_inspections (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_number VARCHAR(20) NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      reference_type VARCHAR(20) NOT NULL,
      reference_id UUID NOT NULL,
      item_id TEXT NOT NULL,
      quantity_inspected INTEGER NOT NULL,
      quantity_accepted INTEGER NOT NULL,
      quantity_rejected INTEGER NOT NULL,
      defects JSONB NOT NULL DEFAULT '[]',
      inspector TEXT NOT NULL,
      approved_by TEXT,
      destination_location_id TEXT NOT NULL,
      photo_urls JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_qc_balance CHECK (quantity_inspected = quantity_accepted + quantity_rejected),
      UNIQUE (business, inspection_number)
    )
  `);

  // rework_orders
  await query(`
    CREATE TABLE IF NOT EXISTS rework_orders (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rework_order_number VARCHAR(20) NOT NULL,
      original_reference_type VARCHAR(20) NOT NULL,
      original_reference_id UUID NOT NULL,
      qc_inspection_id UUID NOT NULL REFERENCES qc_inspections(id),
      item_id TEXT NOT NULL,
      quantity_to_rework INTEGER NOT NULL,
      assigned_worker_type VARCHAR(20) NOT NULL,
      assigned_worker_id TEXT NOT NULL,
      payment_eligibility VARCHAR(20) NOT NULL,
      approved_rate_pkr DECIMAL(10,2) NOT NULL DEFAULT 0,
      quantity_completed INTEGER NOT NULL DEFAULT 0,
      subsequent_qc_id UUID REFERENCES qc_inspections(id),
      cycle_number INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'assigned',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, rework_order_number)
    )
  `);

  // ogp_documents
  await query(`
    CREATE TABLE IF NOT EXISTS ogp_documents (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ogp_number VARCHAR(20) NOT NULL,
      custom_number VARCHAR(50),
      issue_date DATE NOT NULL,
      vendor_id TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      total_issued_quantity INTEGER NOT NULL DEFAULT 0,
      expected_return_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'issued',
      prepared_by TEXT NOT NULL,
      approved_by TEXT,
      remarks TEXT,
      manager_transfer_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, ogp_number)
    )
  `);

  // igp_documents
  await query(`
    CREATE TABLE IF NOT EXISTS igp_documents (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      igp_number VARCHAR(20) NOT NULL,
      custom_number VARCHAR(50),
      ogp_id UUID NOT NULL REFERENCES ogp_documents(id),
      vendor_id TEXT NOT NULL,
      return_date DATE NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      total_returned_quantity INTEGER NOT NULL DEFAULT 0,
      receiving_location_id TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'received',
      received_by TEXT NOT NULL,
      remarks TEXT,
      manager_transfer_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, igp_number)
    )
  `);

  // vendor_earnings
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_earnings (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id TEXT NOT NULL,
      vendor_type VARCHAR(20) NOT NULL,
      reference_type VARCHAR(20) NOT NULL,
      reference_id UUID NOT NULL,
      item_id TEXT NOT NULL,
      quantity_eligible INTEGER NOT NULL,
      rate_per_piece DECIMAL(10,2) NOT NULL,
      amount_pkr DECIMAL(12,2) NOT NULL,
      is_approved BOOLEAN NOT NULL DEFAULT FALSE,
      approved_by TEXT,
      approval_date DATE,
      payment_batch_id UUID REFERENCES vendor_payments(id),
      is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // vendor_payments
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_payments (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_number VARCHAR(20) NOT NULL,
      vendor_id TEXT NOT NULL,
      vendor_type VARCHAR(20) NOT NULL,
      payment_date DATE NOT NULL,
      amount_paid_pkr DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      approved_by TEXT NOT NULL,
      earning_ids UUID[] NOT NULL DEFAULT '{}',
      manager_payment_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, batch_number)
    )
  `);

  // employee_costing
  await query(`
    CREATE TABLE IF NOT EXISTS employee_costing (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id TEXT NOT NULL,
      month VARCHAR(7) NOT NULL,
      monthly_salary_pkr DECIMAL(12,2) NOT NULL,
      allocation_method VARCHAR(20) NOT NULL,
      total_shift_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
      productive_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
      downtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
      allocated_cost_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
      accepted_pieces_produced INTEGER NOT NULL DEFAULT 0,
      effective_cost_per_piece_pkr DECIMAL(10,4) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, employee_id, month)
    )
  `);

  // stocktaking_sessions
  await query(`
    CREATE TABLE IF NOT EXISTS stocktaking_sessions (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_code VARCHAR(20) NOT NULL,
      count_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      is_blind_count BOOLEAN NOT NULL DEFAULT TRUE,
      total_items_counted INTEGER NOT NULL DEFAULT 0,
      total_variance_quantity INTEGER NOT NULL DEFAULT 0,
      total_variance_value_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
      conducted_by TEXT NOT NULL,
      approved_by TEXT,
      notes TEXT,
      manager_count_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business, session_code)
    )
  `);

  // stock_count_lines
  await query(`
    CREATE TABLE IF NOT EXISTS stock_count_lines (
      business VARCHAR(50) NOT NULL,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES stocktaking_sessions(id) ON DELETE CASCADE,
      location_id TEXT NOT NULL,
      location_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_code VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      book_quantity INTEGER NOT NULL DEFAULT 0,
      physical_count INTEGER NOT NULL DEFAULT 0,
      variance_quantity INTEGER NOT NULL DEFAULT 0,
      unit_cost_pkr DECIMAL(10,2) NOT NULL DEFAULT 0,
      variance_value_pkr DECIMAL(12,2) NOT NULL DEFAULT 0,
      investigation_notes TEXT,
      adjustment_posted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // audit_events
  await query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      business VARCHAR(50) NOT NULL DEFAULT 'unknown',
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
    )
  `);

  // master_data_cache
  await query(`
    CREATE TABLE IF NOT EXISTS master_data_cache (
      business VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      manager_key TEXT NOT NULL,
      data JSONB NOT NULL,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (business, entity_type, manager_key)
    )
  `);

  // app_config
  await query(`
    CREATE TABLE IF NOT EXISTS app_config (
      business VARCHAR(50) NOT NULL,
      key VARCHAR(100) NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (business, key)
    )
  `);

  // Record migration
  await query(`
    INSERT INTO schema_migrations (version, name) VALUES ('001', 'initial_schema_with_business_tenant')
    ON CONFLICT (version) DO NOTHING
  `);

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_work_orders_business ON work_orders(business)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(business, date)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_workstation ON work_orders(business, workstation_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_worker ON work_orders(business, assigned_worker_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(business, status)',
    'CREATE INDEX IF NOT EXISTS idx_qc_inspections_business ON qc_inspections(business)',
    'CREATE INDEX IF NOT EXISTS idx_qc_inspections_date ON qc_inspections(business, date)',
    'CREATE INDEX IF NOT EXISTS idx_qc_inspections_reference ON qc_inspections(business, reference_type, reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_qc_inspections_item ON qc_inspections(business, item_id)',
    'CREATE INDEX IF NOT EXISTS idx_rework_orders_business ON rework_orders(business)',
    'CREATE INDEX IF NOT EXISTS idx_rework_orders_original ON rework_orders(business, original_reference_type, original_reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_rework_orders_qc ON rework_orders(business, qc_inspection_id)',
    'CREATE INDEX IF NOT EXISTS idx_rework_orders_assigned ON rework_orders(business, assigned_worker_type, assigned_worker_id)',
    'CREATE INDEX IF NOT EXISTS idx_ogp_business ON ogp_documents(business)',
    'CREATE INDEX IF NOT EXISTS idx_ogp_vendor ON ogp_documents(business, vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_ogp_status ON ogp_documents(business, status)',
    'CREATE INDEX IF NOT EXISTS idx_igp_business ON igp_documents(business)',
    'CREATE INDEX IF NOT EXISTS idx_igp_ogp ON igp_documents(business, ogp_id)',
    'CREATE INDEX IF NOT EXISTS idx_igp_vendor ON igp_documents(business, vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_earnings_business ON vendor_earnings(business)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_earnings_vendor ON vendor_earnings(business, vendor_id, vendor_type)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_earnings_reference ON vendor_earnings(business, reference_type, reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_earnings_approval ON vendor_earnings(business, is_approved, is_paid)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_business ON vendor_payments(business)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(business, vendor_id, vendor_type)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(business, payment_date)',
    'CREATE INDEX IF NOT EXISTS idx_employee_costing_business ON employee_costing(business)',
    'CREATE INDEX IF NOT EXISTS idx_employee_costing_month ON employee_costing(business, month)',
    'CREATE INDEX IF NOT EXISTS idx_stocktaking_business ON stocktaking_sessions(business)',
    'CREATE INDEX IF NOT EXISTS idx_stocktaking_date ON stocktaking_sessions(business, count_date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_count_business ON stock_count_lines(business)',
    'CREATE INDEX IF NOT EXISTS idx_stock_count_session ON stock_count_lines(business, session_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_count_location_item ON stock_count_lines(business, location_id, item_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_events(business)',
    'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(business, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(business, entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(business, user_id)',
    'CREATE INDEX IF NOT EXISTS idx_master_cache_business ON master_data_cache(business)',
    'CREATE INDEX IF NOT EXISTS idx_master_cache_synced ON master_data_cache(business, synced_at)',
  ];

  for (const indexSql of indexes) {
    await query(indexSql);
  }

  console.log('Database schema initialized');
}

export async function closePool(): Promise<void> {
  await pool.end();
}