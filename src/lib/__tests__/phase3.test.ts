import { describe, expect, it } from "vitest";
import {
  summarizeTuitionReconciliation,
  toVnDateString,
  type PaidTuitionEntry,
} from "../services/reconciliation";
import { formatAuditLogEntry } from "../services/audit-formatter";

describe("Phase 3 – Tuition Reconciliation & Audit Log Formatting", () => {
  const sampleEntries: PaidTuitionEntry[] = [
    {
      id: "rec-1",
      classId: "cls-1",
      className: "Toán Lớp 4",
      cycleNumber: 1,
      studentId: "stu-1",
      studentName: "Nguyễn Văn Nam",
      studentUsername: "nguyenvannam_01",
      finalAmount: 800000,
      paymentMethod: "CASH",
      collectedByUserId: "teacher-1",
      collectedByName: "Cô Trần Thu Hà",
      paidAtIso: "2026-11-02T03:00:00.000Z", // 10:00 AM Vietnam time
    },
    {
      id: "rec-2",
      classId: "cls-1",
      className: "Toán Lớp 4",
      cycleNumber: 1,
      studentId: "stu-2",
      studentName: "Lê Minh Châu",
      studentUsername: "leminhchau_01",
      finalAmount: 750000,
      paymentMethod: "TRANSFER",
      collectedByUserId: "teacher-1",
      collectedByName: "Cô Trần Thu Hà",
      paidAtIso: "2026-11-02T04:00:00.000Z",
    },
    {
      id: "rec-3",
      classId: "cls-2",
      className: "Tiếng Anh Lớp 4",
      cycleNumber: 1,
      studentId: "stu-3",
      studentName: "Phạm Gia Huy",
      studentUsername: "phamgiahuy_01",
      finalAmount: 960000,
      paymentMethod: "CASH",
      collectedByUserId: "admin-1",
      collectedByName: "Thầy Nguyễn Minh Trí",
      paidAtIso: "2026-11-02T05:00:00.000Z",
    },
    {
      id: "rec-old",
      classId: "cls-2",
      className: "Tiếng Anh Lớp 4",
      cycleNumber: 1,
      studentId: "stu-4",
      studentName: "Đỗ Bảo Ngọc",
      studentUsername: "dobaongoc_01",
      finalAmount: 960000,
      paymentMethod: "CASH",
      collectedByUserId: "admin-1",
      collectedByName: "Thầy Nguyễn Minh Trí",
      paidAtIso: "2026-10-25T05:00:00.000Z", // Outside 2026-11-02
    },
  ];

  it("converts UTC timestamps accurately to Asia/Ho_Chi_Minh YYYY-MM-DD", () => {
    // 2026-11-01T18:30:00Z is 2026-11-02 01:30:00 in GMT+7
    expect(toVnDateString("2026-11-01T18:30:00.000Z")).toBe("2026-11-02");
  });

  it("groups Cash vs Transfer accurately per collector within date range", () => {
    const summary = summarizeTuitionReconciliation(
      sampleEntries,
      "2026-11-02",
      "2026-11-02"
    );

    expect(summary.totalCashCount).toBe(2);
    expect(summary.totalCashAmount).toBe(1760000);
    expect(summary.totalTransferCount).toBe(1);
    expect(summary.totalTransferAmount).toBe(750000);
    expect(summary.grandTotalAmount).toBe(2510000);
    expect(summary.byCollector).toHaveLength(2);

    // Sorted by highest cash held first
    expect(summary.byCollector[0].collectorName).toBe("Thầy Nguyễn Minh Trí");
    expect(summary.byCollector[0].cashAmount).toBe(960000);
    expect(summary.byCollector[1].collectorName).toBe("Cô Trần Thu Hà");
    expect(summary.byCollector[1].cashAmount).toBe(800000);
    expect(summary.byCollector[1].transferAmount).toBe(750000);
  });

  it("formats audit log entries into readable Vietnamese summaries", () => {
    const collectLog = formatAuditLogEntry("COLLECT_TUITION", {
      paymentMethod: "CASH",
      finalAmount: 750000,
      cycleNumber: 2,
    });
    expect(collectLog.category).toBe("TUITION");
    expect(collectLog.label).toBe("Thu học phí (Tiền mặt)");
    expect(collectLog.summary).toContain("750.000");
    expect(collectLog.summary).toContain("Kỳ #2");

    const revertLog = formatAuditLogEntry("REVERT_TUITION", {
      finalAmount: 750000,
      reason: "Bấm nhầm nút",
    });
    expect(revertLog.category).toBe("TUITION");
    expect(revertLog.badgeTone).toBe("pink");
    expect(revertLog.summary).toContain("Bấm nhầm nút");
  });
});
