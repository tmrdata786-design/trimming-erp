import { describe, it, expect } from 'vitest';
import {
  createWorkOrderSchema,
  closeWorkOrderSchema,
  createQCInspectionSchema,
  verifyContextSchema,
  elevateContextSchema,
  validate,
} from '../src/utils/validation.js';

describe('Validation schemas', () => {
  describe('createWorkOrderSchema', () => {
    it('accepts valid work order', () => {
      const result = createWorkOrderSchema.safeParse({
        date: '2026-11-01',
        shiftId: 'SHIFT_A',
        workstationId: 'WS-01',
        assignedWorkerId: 'w-ih-01',
        itemId: 'item-mld-001',
        stageName: 'Primary Trimming',
        quantityIssued: 400,
        plannedQuantity: 900,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date', () => {
      const result = createWorkOrderSchema.safeParse({
        date: 'not-a-date',
        shiftId: 'SHIFT_A',
        workstationId: 'WS-01',
        assignedWorkerId: 'w-ih-01',
        itemId: 'item-mld-001',
        stageName: 'Primary Trimming',
        quantityIssued: 400,
        plannedQuantity: 900,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid workstation format', () => {
      const result = createWorkOrderSchema.safeParse({
        date: '2026-11-01',
        shiftId: 'SHIFT_A',
        workstationId: 'INVALID',
        assignedWorkerId: 'w-ih-01',
        itemId: 'item-mld-001',
        stageName: 'Primary Trimming',
        quantityIssued: 400,
        plannedQuantity: 900,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('closeWorkOrderSchema', () => {
    it('accepts valid close data', () => {
      const result = closeWorkOrderSchema.safeParse({
        actualTrimmed: 350,
        returnedUntrimmed: 50,
        closingBalanceAtWs: 0,
        downtimeMinutes: 25,
      });
      expect(result.success).toBe(true);
      // Verify invariant would be checked at business logic level
    });

    it('accepts zero values', () => {
      const result = closeWorkOrderSchema.safeParse({
        actualTrimmed: 0,
        returnedUntrimmed: 0,
        closingBalanceAtWs: 0,
        downtimeMinutes: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createQCInspectionSchema', () => {
    it('accepts balanced quantities', () => {
      const result = createQCInspectionSchema.safeParse({
        date: '2026-11-01T14:00:00Z',
        referenceType: 'work_order',
        referenceId: '00000000-0000-0000-0000-000000000001',
        itemId: 'item-trm-001',
        quantityInspected: 350,
        quantityAccepted: 300,
        quantityRejected: 50,
        inspector: 'Khurram QC',
        destinationLocationId: 'loc-fin-store',
      });
      expect(result.success).toBe(true);
    });

    it('rejects imbalanced quantities', () => {
      const result = createQCInspectionSchema.safeParse({
        date: '2026-11-01T14:00:00Z',
        referenceType: 'work_order',
        referenceId: '00000000-0000-0000-0000-000000000001',
        itemId: 'item-trm-001',
        quantityInspected: 350,
        quantityAccepted: 300,
        quantityRejected: 60, // 300+60=360 != 350
        inspector: 'Khurram QC',
        destinationLocationId: 'loc-fin-store',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyContextSchema', () => {
    it('accepts valid business name', () => {
      const result = verifyContextSchema.safeParse({ business: 'KEEL' });
      expect(result.success).toBe(true);
    });

    it('rejects empty business', () => {
      const result = verifyContextSchema.safeParse({ business: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('elevateContextSchema', () => {
    it('accepts valid access code', () => {
      const result = elevateContextSchema.safeParse({ business: 'KEEL', accessCode: 'mycode123' });
      expect(result.success).toBe(true);
    });

    it('rejects short access code', () => {
      const result = elevateContextSchema.safeParse({ business: 'KEEL', accessCode: 'abc' });
      expect(result.success).toBe(false);
    });
  });
});