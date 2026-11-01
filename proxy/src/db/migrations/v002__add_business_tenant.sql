-- Migration 002: Add business tenant column to all operational tables
-- Run only when schema already exists without business column.

-- Helper function (plpgsql)
DO $$
BEGIN
  -- work_orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'business') THEN
    ALTER TABLE work_orders ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_work_order_number_key;
    ALTER TABLE work_orders ADD CONSTRAINT work_orders_business_work_order_number_key UNIQUE (business, work_order_number);
    CREATE INDEX IF NOT EXISTS idx_work_orders_business ON work_orders(business);
  END IF;

  -- qc_inspections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qc_inspections' AND column_name = 'business') THEN
    ALTER TABLE qc_inspections ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE qc_inspections DROP CONSTRAINT IF EXISTS qc_inspections_inspection_number_key;
    ALTER TABLE qc_inspections ADD CONSTRAINT qc_inspections_business_inspection_number_key UNIQUE (business, inspection_number);
    CREATE INDEX IF NOT EXISTS idx_qc_inspections_business ON qc_inspections(business);
  END IF;

  -- rework_orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rework_orders' AND column_name = 'business') THEN
    ALTER TABLE rework_orders ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE rework_orders DROP CONSTRAINT IF EXISTS rework_orders_rework_order_number_key;
    ALTER TABLE rework_orders ADD CONSTRAINT rework_orders_business_rework_order_number_key UNIQUE (business, rework_order_number);
    CREATE INDEX IF NOT EXISTS idx_rework_orders_business ON rework_orders(business);
  END IF;

  -- ogp_documents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ogp_documents' AND column_name = 'business') THEN
    ALTER TABLE ogp_documents ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE ogp_documents DROP CONSTRAINT IF EXISTS ogp_documents_ogp_number_key;
    ALTER TABLE ogp_documents ADD CONSTRAINT ogp_documents_business_ogp_number_key UNIQUE (business, ogp_number);
    CREATE INDEX IF NOT EXISTS idx_ogp_business ON ogp_documents(business);
  END IF;

  -- igp_documents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'igp_documents' AND column_name = 'business') THEN
    ALTER TABLE igp_documents ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE igp_documents DROP CONSTRAINT IF EXISTS igp_documents_igp_number_key;
    ALTER TABLE igp_documents ADD CONSTRAINT igp_documents_business_igp_number_key UNIQUE (business, igp_number);
    CREATE INDEX IF NOT EXISTS idx_igp_business ON igp_documents(business);
  END IF;

  -- vendor_earnings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_earnings' AND column_name = 'business') THEN
    ALTER TABLE vendor_earnings ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_vendor_earnings_business ON vendor_earnings(business);
  END IF;

  -- vendor_payments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_payments' AND column_name = 'business') THEN
    ALTER TABLE vendor_payments ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_batch_number_key;
    ALTER TABLE vendor_payments ADD CONSTRAINT vendor_payments_business_batch_number_key UNIQUE (business, batch_number);
    CREATE INDEX IF NOT EXISTS idx_vendor_payments_business ON vendor_payments(business);
  END IF;

  -- employee_costing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_costing' AND column_name = 'business') THEN
    ALTER TABLE employee_costing ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE employee_costing DROP CONSTRAINT IF EXISTS employee_costing_employee_id_month_key;
    ALTER TABLE employee_costing ADD CONSTRAINT employee_costing_business_employee_id_month_key UNIQUE (business, employee_id, month);
    CREATE INDEX IF NOT EXISTS idx_employee_costing_business ON employee_costing(business);
  END IF;

  -- stocktaking_sessions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stocktaking_sessions' AND column_name = 'business') THEN
    ALTER TABLE stocktaking_sessions ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE stocktaking_sessions DROP CONSTRAINT IF EXISTS stocktaking_sessions_session_code_key;
    ALTER TABLE stocktaking_sessions ADD CONSTRAINT stocktaking_sessions_business_session_code_key UNIQUE (business, session_code);
    CREATE INDEX IF NOT EXISTS idx_stocktaking_business ON stocktaking_sessions(business);
  END IF;

  -- stock_count_lines
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_count_lines' AND column_name = 'business') THEN
    ALTER TABLE stock_count_lines ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_stock_count_business ON stock_count_lines(business);
  END IF;

  -- audit_events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_events' AND column_name = 'business') THEN
    ALTER TABLE audit_events ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'unknown';
    CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_events(business);
  END IF;

  -- master_data_cache
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_data_cache' AND column_name = 'business') THEN
    ALTER TABLE master_data_cache ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT 'default';
    ALTER TABLE master_data_cache DROP CONSTRAINT IF EXISTS master_data_cache_pkey;
    ALTER TABLE master_data_cache ADD PRIMARY KEY (business, entity_type, manager_key);
    CREATE INDEX IF NOT EXISTS idx_master_cache_business ON master_data_cache(business);
  END IF;

  -- app_config
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'business') THEN
    ALTER TABLE app_config ADD COLUMN business VARCHAR(50) NOT NULL DEFAULT '*';
    ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_pkey;
    ALTER TABLE app_config ADD PRIMARY KEY (business, key);
  END IF;
END
$$;