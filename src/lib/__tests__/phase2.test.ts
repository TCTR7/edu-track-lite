import { describe, expect, it } from "vitest";
import { calculateStudentCycleBill } from "@/lib/services/tuition-calc";
import { evaluateAcademicTrend } from "@/lib/utils/academic-trend";
import { buildObjectKey, sanitizeFileExtension } from "@/lib/storage";

const base = {
  tuitionPerCycle: 800000,
  sessionsPerCycle: 16,
  deductionPerSession: 50000,
};

describe("Phase 2 – Tuition calculation", () => {
  it("charges full tuition for a full cycle with no absences", () => {
    const r = calculateStudentCycleBill({
      ...base,
      billableSessions: 16,
      excusedAbsentCount: 0,
      unexcusedAbsentCount: 0,
    });
    expect(r.baseAmount).toBe(800000);
    expect(r.finalAmount).toBe(800000);
  });

  it("deducts excused absences but not unexcused ones", () => {
    const r = calculateStudentCycleBill({
      ...base,
      billableSessions: 16,
      excusedAbsentCount: 2,
      unexcusedAbsentCount: 3,
    });
    expect(r.deductedAmount).toBe(100000);
    expect(r.finalAmount).toBe(700000);
  });

  it("bills only attended-enrolled sessions for mid-cycle joiners", () => {
    const r = calculateStudentCycleBill({
      ...base,
      billableSessions: 10,
      excusedAbsentCount: 0,
      unexcusedAbsentCount: 0,
    });
    expect(r.baseAmount).toBe(500000);
    expect(r.finalAmount).toBe(500000);
  });

  it("applies positive and negative adjustments and never goes below zero", () => {
    const up = calculateStudentCycleBill({
      ...base,
      billableSessions: 16,
      excusedAbsentCount: 0,
      unexcusedAbsentCount: 0,
      adjustmentAmount: 30000,
    });
    expect(up.finalAmount).toBe(830000);

    const down = calculateStudentCycleBill({
      ...base,
      billableSessions: 2,
      excusedAbsentCount: 2,
      unexcusedAbsentCount: 0,
      adjustmentAmount: -50000,
    });
    expect(down.finalAmount).toBe(0);
  });
});

describe("Phase 2 – Academic trend", () => {
  it("handles empty and single-score data", () => {
    expect(evaluateAcademicTrend([]).trend).toBe("INSUFFICIENT_DATA");
    expect(evaluateAcademicTrend([9]).trend).toBe("IMPROVING");
    expect(evaluateAcademicTrend([6.5]).trend).toBe("STEADY");
    expect(evaluateAcademicTrend([4]).trend).toBe("NEEDS_EFFORT");
  });

  it("detects improving, steady and declining trends", () => {
    expect(evaluateAcademicTrend([6, 6.5, 8, 8.5]).trend).toBe("IMPROVING");
    expect(evaluateAcademicTrend([7, 7.2, 7, 7.1]).trend).toBe("STEADY");
    expect(evaluateAcademicTrend([8, 8, 6, 5]).trend).toBe("NEEDS_EFFORT");
  });
});

describe("Phase 2 – Storage keys", () => {
  it("builds tenant-scoped keys and safe extensions", () => {
    const key = buildObjectKey({
      folder: "homeworks",
      centerId: "center-1",
      fileName: "bai tap.WEBP",
      mimeType: "image/webp",
    });
    expect(key).toMatch(/^homeworks\/center-1\/[0-9a-f-]+\.webp$/);
    expect(sanitizeFileExtension("noext", "application/pdf")).toBe(".pdf");
  });
});
