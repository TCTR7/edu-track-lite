import type { ScheduleSlot } from "@/db/schema";

const DAY_LABELS: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export function formatScheduleSlot(slot: ScheduleSlot): string {
  const day = DAY_LABELS[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`;
  return `${day} (${slot.startTime}–${slot.endTime})`;
}

export function formatScheduleSummary(slots: ScheduleSlot[]): string {
  if (!slots || slots.length === 0) return "Chưa xếp lịch";
  return slots.map(formatScheduleSlot).join(", ");
}

function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Checks if `now` falls within +/- bufferMinutes (default 15m) of any scheduled slot today.
 */
export function isClassInSessionNow(
  slots: ScheduleSlot[],
  now: Date = new Date(),
  bufferMinutes = 15
): boolean {
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.some((slot) => {
    if (slot.dayOfWeek !== currentDay) return false;
    const start = parseMinutes(slot.startTime);
    const end = parseMinutes(slot.endTime);
    if (start === null || end === null) return false;
    return (
      currentMinutes >= start - bufferMinutes &&
      currentMinutes <= end + bufferMinutes
    );
  });
}
