export interface PaidTuitionEntry {
  id: string;
  classId: string;
  className: string;
  cycleNumber: number;
  studentId: string;
  studentName: string;
  studentUsername: string;
  finalAmount: number;
  paymentMethod: "CASH" | "TRANSFER";
  collectedByUserId: string;
  collectedByName: string;
  paidAtIso: string;
}

export interface CollectorReconciliationRow {
  collectorId: string;
  collectorName: string;
  cashCount: number;
  cashAmount: number;
  transferCount: number;
  transferAmount: number;
  totalCount: number;
  totalAmount: number;
}

export interface ReconciliationSummary {
  fromDate: string;
  toDate: string;
  totalCashCount: number;
  totalCashAmount: number;
  totalTransferCount: number;
  totalTransferAmount: number;
  grandTotalCount: number;
  grandTotalAmount: number;
  byCollector: CollectorReconciliationRow[];
  matchingEntries: PaidTuitionEntry[];
}

/**
 * Converts an ISO timestamp into YYYY-MM-DD in Vietnam timezone (Asia/Ho_Chi_Minh).
 */
export function toVnDateString(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Computes Cash vs Bank Transfer reconciliation grouped by collector within [fromDate, toDate].
 */
export function summarizeTuitionReconciliation(
  entries: PaidTuitionEntry[],
  fromDate: string,
  toDate: string
): ReconciliationSummary {
  const matchingEntries = entries.filter((entry) => {
    const vnDate = toVnDateString(entry.paidAtIso);
    return vnDate >= fromDate && vnDate <= toDate;
  });

  let totalCashCount = 0;
  let totalCashAmount = 0;
  let totalTransferCount = 0;
  let totalTransferAmount = 0;

  const collectorMap = new Map<string, CollectorReconciliationRow>();

  for (const item of matchingEntries) {
    const row = collectorMap.get(item.collectedByUserId) ?? {
      collectorId: item.collectedByUserId,
      collectorName: item.collectedByName,
      cashCount: 0,
      cashAmount: 0,
      transferCount: 0,
      transferAmount: 0,
      totalCount: 0,
      totalAmount: 0,
    };

    if (item.paymentMethod === "CASH") {
      row.cashCount += 1;
      row.cashAmount += item.finalAmount;
      totalCashCount += 1;
      totalCashAmount += item.finalAmount;
    } else {
      row.transferCount += 1;
      row.transferAmount += item.finalAmount;
      totalTransferCount += 1;
      totalTransferAmount += item.finalAmount;
    }

    row.totalCount += 1;
    row.totalAmount += item.finalAmount;
    collectorMap.set(item.collectedByUserId, row);
  }

  const byCollector = Array.from(collectorMap.values()).sort(
    (a, b) => b.cashAmount - a.cashAmount || b.totalAmount - a.totalAmount
  );

  return {
    fromDate,
    toDate,
    totalCashCount,
    totalCashAmount,
    totalTransferCount,
    totalTransferAmount,
    grandTotalCount: totalCashCount + totalTransferCount,
    grandTotalAmount: totalCashAmount + totalTransferAmount,
    byCollector,
    matchingEntries,
  };
}
