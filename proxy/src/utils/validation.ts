import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  date: z.string().date(),
  shiftId: z.enum(['SHIFT_A', 'SHIFT_B', 'SHIFT_C']),
  workstationId: z.string().regex(/^WS-\d{2}$/),
  assignedWorkerId: z.string().min(1),
  itemId: z.string().min(1),
  stageName: z.string().min(1),
  sourcePtnId: z.string().optional(),
  quantityIssued: z.number().int().positive(),
  plannedQuantity: z.number().int().nonnegative(),
});

export const updateWorkOrderSchema = z.object({
  actualTrimmedQuantity: z.number().int().nonnegative().optional(),
  quantitySentToQc: z.number().int().nonnegative().optional(),
  quantityReturnedUntrimmed: z.number().int().nonnegative().optional(),
  closingBalance: z.number().int().nonnegative().optional(),
  downtimeMinutes: z.number().int().nonnegative().optional(),
  delayReason: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'closed', 'reconciled']).optional(),
  supervisorNotes: z.string().optional(),
  verifiedBy: z.string().optional(),
});

export const closeWorkOrderSchema = z.object({
  actualTrimmed: z.number().int().nonnegative(),
  returnedUntrimmed: z.number().int().nonnegative(),
  closingBalanceAtWs: z.number().int().nonnegative(),
  downtimeMinutes: z.number().int().nonnegative(),
  delayReason: z.string().optional(),
  notes: z.string().optional(),
});

export const createQCInspectionSchema = z.object({
  date: z.string().datetime(),
  referenceType: z.enum(['work_order', 'igp', 'rework_order']),
  referenceId: z.string().uuid(),
  itemId: z.string().min(1),
  quantityInspected: z.number().int().positive(),
  quantityAccepted: z.number().int().nonnegative(),
  quantityRejected: z.number().int().nonnegative(),
  defects: z.array(z.object({
    defectType: z.enum(['flash_excess', 'over_trim_gouge', 'short_mould', 'sink_mark', 'parting_line', 'other']),
    count: z.number().int().positive(),
  })).default([]),
  inspector: z.string().min(1),
  approvedBy: z.string().optional(),
  destinationLocationId: z.string().min(1),
  photoUrls: z.array(z.string().url()).default([]),
  notes: z.string().optional(),
}).refine(data => data.quantityInspected === data.quantityAccepted + data.quantityRejected, {
  message: 'Inspected quantity must equal accepted + rejected',
  path: ['quantityInspected'],
});

export const createReworkOrderSchema = z.object({
  originalReferenceType: z.enum(['work_order', 'igp']),
  originalReferenceId: z.string().uuid(),
  qcInspectionId: z.string().uuid(),
  itemId: z.string().min(1),
  quantityToRework: z.number().int().positive(),
  assignedWorkerType: z.enum(['employee', 'in_house_vendor', 'outsourced_vendor']),
  assignedWorkerId: z.string().min(1),
  paymentEligibility: z.enum(['unpaid', 'standard_rate', 'special_approved_rate']),
  approvedRatePkr: z.number().nonnegative().default(0),
  cycleNumber: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const createOGPSchema = z.object({
  customNumber: z.string().optional(),
  issueDate: z.string().date(),
  vendorId: z.string().min(1),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().positive(),
    ratePerPiece: z.number().nonnegative(),
  })).min(1),
  expectedReturnDate: z.string().date().optional(),
  preparedBy: z.string().min(1),
  approvedBy: z.string().optional(),
  remarks: z.string().optional(),
});

export const createIGPSchema = z.object({
  customNumber: z.string().optional(),
  ogpId: z.string().uuid(),
  vendorId: z.string().min(1),
  returnDate: z.string().date(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantityReturned: z.number().int().positive(),
    qcStatus: z.enum(['pending', 'inspected']).default('pending'),
    acceptedQuantity: z.number().int().nonnegative().optional(),
    rejectedQuantity: z.number().int().nonnegative().optional(),
  })).min(1),
  receivingLocationId: z.string().min(1),
  receivedBy: z.string().min(1),
  remarks: z.string().optional(),
});

export const createVendorEarningSchema = z.object({
  vendorId: z.string().min(1),
  vendorType: z.enum(['in_house_vendor', 'outsourced_vendor']),
  referenceType: z.enum(['work_order', 'igp', 'rework_order']),
  referenceId: z.string().uuid(),
  itemId: z.string().min(1),
  quantityEligible: z.number().int().positive(),
  ratePerPiece: z.number().nonnegative(),
});

export const approveVendorEarningSchema = z.object({
  approvedBy: z.string().min(1),
});

export const createVendorPaymentSchema = z.object({
  vendorId: z.string().min(1),
  vendorType: z.enum(['in_house_vendor', 'outsourced_vendor']),
  paymentDate: z.string().date(),
  amountPaidPkr: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque']),
  referenceNumber: z.string().min(1),
  notes: z.string().optional(),
  approvedBy: z.string().min(1),
  earningIds: z.array(z.string().uuid()).min(1),
});

export const createEmployeeCostingSchema = z.object({
  employeeId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  monthlySalaryPkr: z.number().nonnegative(),
  allocationMethod: z.enum(['hour_based', 'production_based', 'hybrid']),
  totalShiftHours: z.number().nonnegative().default(0),
  productiveHours: z.number().nonnegative().default(0),
  downtimeHours: z.number().nonnegative().default(0),
  acceptedPiecesProduced: z.number().int().nonnegative().default(0),
});

export const createStocktakingSessionSchema = z.object({
  countDate: z.string().date(),
  isBlindCount: z.boolean().default(true),
  conductedBy: z.string().min(1),
  notes: z.string().optional(),
});

export const addStockCountLineSchema = z.object({
  locationId: z.string().min(1),
  locationName: z.string().min(1),
  itemId: z.string().min(1),
  itemCode: z.string().min(1),
  status: z.enum(['untrimmed', 'in_trimming', 'qc_pending', 'rework_holding', 'approved_finished', 'scrapped']),
  bookQuantity: z.number().int().default(0),
  physicalCount: z.number().int().default(0),
  unitCostPkr: z.number().nonnegative().default(0),
  investigationNotes: z.string().optional(),
});

export const approveStockAdjustmentSchema = z.object({
  investigator: z.string().min(1),
  approver: z.string().min(1),
});

export const verifyContextSchema = z.object({
  business: z.string().min(1),
  entity: z.string().optional(),
  key: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const elevateContextSchema = z.object({
  business: z.string().min(1),
  accessCode: z.string().min(4),
  userEmail: z.string().email().optional(),
});

export function validate(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validated = result.data;
    next();
  };
}