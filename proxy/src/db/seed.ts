/**
 * Seed initial configuration data. Safe to re-run (UPSERT).
 * Only seeds app_config rows — never touches business records.
 */
import { query } from './pool.js';

async function seed(): Promise<void> {
  const configs = [
    {
      business: '*',
      key: 'workstations',
      value: JSON.stringify(Array.from({ length: 70 }, (_, i) => `WS-${String(i + 1).padStart(2, '0')}`)),
      description: 'List of all workstation codes',
    },
    {
      business: '*',
      key: 'shifts',
      value: JSON.stringify([
        { id: 'SHIFT_A', name: 'Shift A', start: '07:00', end: '15:30', breakMin: 60, netHours: 7.5 },
        { id: 'SHIFT_B', name: 'Shift B', start: '15:30', end: '23:30', breakMin: 30, netHours: 7.5 },
        { id: 'SHIFT_C', name: 'Shift C', start: '23:30', end: '07:00', breakMin: 30, netHours: 7.0, overnight: true },
      ]),
      description: 'Configured shifts',
    },
    {
      business: '*',
      key: 'defectTypes',
      value: JSON.stringify(['flash_excess', 'over_trim_gouge', 'short_mould', 'sink_mark', 'parting_line', 'other']),
      description: 'QC defect type options',
    },
    {
      business: '*',
      key: 'reworkRules',
      value: JSON.stringify(['unpaid_original', 'standard_rate', 'supervisor_decision']),
      description: 'Rework payment eligibility rules',
    },
    {
      business: '*',
      key: 'trimmingItemTypes',
      value: JSON.stringify(['untrimmed_molding', 'intermediate', 'trimmed_finished']),
      description: 'Trimming item type dropdown options',
    },
    {
      business: '*',
      key: 'vendorCategories',
      value: JSON.stringify(['in_house_vendor', 'outsourced_vendor']),
      description: 'Vendor category dropdown options',
    },
  ];

  for (const c of configs) {
    await query(
      `INSERT INTO app_config (business, key, value, description) VALUES ($1, $2, $3, $4)
       ON CONFLICT (business, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [c.business, c.key, c.value, c.description]
    );
  }

  console.log('Seed completed');
}

seed().catch(e => { console.error(e); process.exit(1); });