export interface TuitionCalculationInput {
  tuitionPerCycle: number;
  sessionsPerCycle: number;
  deductionPerSession: number;
  billableSessions: number;
  excusedAbsentCount: number;
  unexcusedAbsentCount: number;
  adjustmentAmount?: number;
}

export interface TuitionCalculationResult {
  billableSessions: number;
  excusedAbsentCount: number;
  unexcusedAbsentCount: number;
  baseAmount: number;
  deductedAmount: number;
  adjustmentAmount: number;
  finalAmount: number;
}

/**
 * Pure billing formula per EduTrack_Specs.md v1.1 (Module 3):
 * - Full cycle (billableSessions >= sessionsPerCycle): baseAmount = tuitionPerCycle
 * - Mid-cycle join/leave (billableSessions < sessionsPerCycle): baseAmount = billableSessions * deductionPerSession
 * - deductedAmount = excusedAbsentCount * deductionPerSession
 * - finalAmount = max(0, baseAmount - deductedAmount + adjustmentAmount)
 */
export function calculateStudentCycleBill(
  input: TuitionCalculationInput
): TuitionCalculationResult {
  const adjustmentAmount = Math.round(input.adjustmentAmount ?? 0);
  const isFullCycle = input.billableSessions >= input.sessionsPerCycle;

  const baseAmount = isFullCycle
    ? input.tuitionPerCycle
    : input.billableSessions * input.deductionPerSession;

  const deductedAmount = input.excusedAbsentCount * input.deductionPerSession;
  const finalAmount = Math.max(
    0,
    baseAmount - deductedAmount + adjustmentAmount
  );

  return {
    billableSessions: input.billableSessions,
    excusedAbsentCount: input.excusedAbsentCount,
    unexcusedAbsentCount: input.unexcusedAbsentCount,
    baseAmount,
    deductedAmount,
    adjustmentAmount,
    finalAmount,
  };
}
