import type { AuditActionType } from "./audit";
import { formatCurrencyVnd } from "@/lib/utils";

export type AuditCategory = "TUITION" | "ATTENDANCE" | "ACADEMIC" | "ACCOUNT";

export interface FormattedAuditInfo {
  label: string;
  category: AuditCategory;
  badgeTone: "mint" | "pink" | "butter" | "lavender" | "sky";
  summary: string;
}

export function formatAuditLogEntry(
  actionType: AuditActionType,
  details: Record<string, unknown> | null | undefined
): FormattedAuditInfo {
  const d = details ?? {};

  switch (actionType) {
    case "COLLECT_TUITION": {
      const method =
        d.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản";
      const amount =
        typeof d.finalAmount === "number"
          ? formatCurrencyVnd(d.finalAmount)
          : "";
      const cycle = d.cycleNumber ? `Kỳ #${d.cycleNumber}` : "";
      return {
        label: `Thu học phí (${method})`,
        category: "TUITION",
        badgeTone: "mint",
        summary: `Đã xác nhận thu ${amount} (${method}) ${cycle}`.trim(),
      };
    }

    case "REVERT_TUITION": {
      const amount =
        typeof d.finalAmount === "number"
          ? formatCurrencyVnd(d.finalAmount)
          : "";
      const reason = d.reason ? ` – Lý do: ${String(d.reason)}` : "";
      return {
        label: "Hoàn tác / Hủy thu học phí",
        category: "TUITION",
        badgeTone: "pink",
        summary: `Đã chuyển hóa đơn ${amount} về trạng thái Chưa đóng${reason}`,
      };
    }

    case "ADJUST_TUITION": {
      const adj =
        typeof d.adjustmentAmount === "number" ? d.adjustmentAmount : 0;
      const sign = adj >= 0 ? "+" : "";
      const finalAmt =
        typeof d.finalAmount === "number"
          ? ` → Thực thu mới: ${formatCurrencyVnd(d.finalAmount)}`
          : "";
      const note = d.adjustmentNote ? ` (${String(d.adjustmentNote)})` : "";
      return {
        label: "Điều chỉnh học phí",
        category: "TUITION",
        badgeTone: "butter",
        summary: `Điều chỉnh ${sign}${formatCurrencyVnd(adj)}${note}${finalAmt}`,
      };
    }

    case "CREATE_ATTENDANCE_SESSION": {
      const sDate = d.sessionDate ? String(d.sessionDate) : "";
      const cyc = d.cycleNumber ? `Kỳ ${String(d.cycleNumber)}` : "";
      const seq = d.sessionNumberInCycle
        ? `Buổi ${String(d.sessionNumberInCycle)}`
        : "";
      return {
        label: "Mở buổi điểm danh",
        category: "ATTENDANCE",
        badgeTone: "lavender",
        summary: `Khởi tạo điểm danh ngày ${sDate} (${cyc} • ${seq})`,
      };
    }

    case "UPDATE_ATTENDANCE": {
      const statusMap: Record<string, string> = {
        PRESENT: "Có mặt",
        ABSENT_EXCUSED: "Nghỉ có phép (-phí)",
        ABSENT_UNEXCUSED: "Vắng tự ý",
      };
      const prev = statusMap[String(d.previousStatus)] ?? String(d.previousStatus ?? "");
      const next = statusMap[String(d.nextStatus)] ?? String(d.nextStatus ?? "");
      return {
        label: "Cập nhật điểm danh",
        category: "ATTENDANCE",
        badgeTone: "sky",
        summary: `Đổi trạng thái từ "${prev}" sang "${next}"`,
      };
    }

    case "ADD_BONUS_POINT": {
      const delta = Number(d.delta ?? 1);
      const sign = delta > 0 ? `+${delta}` : String(delta);
      const reason = d.reason ? ` (${String(d.reason)})` : "";
      return {
        label: "Cộng / Điều chỉnh điểm thưởng",
        category: "ACADEMIC",
        badgeTone: "butter",
        summary: `Ghi nhận ${sign} điểm khuyến khích${reason}`,
      };
    }

    case "ADD_TEST_SCORE": {
      return {
        label: "Nhập điểm kiểm tra",
        category: "ACADEMIC",
        badgeTone: "mint",
        summary: `Bài "${String(d.title ?? "")}": ${String(d.score ?? "")} điểm (ngày ${String(d.recordedDate ?? "")})`,
      };
    }

    case "UPDATE_TEST_SCORE": {
      return {
        label: "Cập nhật điểm kiểm tra",
        category: "ACADEMIC",
        badgeTone: "sky",
        summary: `Cập nhật điểm bài "${String(d.title ?? "")}": ${String(d.score ?? "")} điểm`,
      };
    }

    case "DELETE_TEST_SCORE": {
      return {
        label: "Xóa điểm kiểm tra",
        category: "ACADEMIC",
        badgeTone: "pink",
        summary: `Đã xóa bài kiểm tra "${String(d.title ?? "")}" (${String(d.score ?? "")} điểm)`,
      };
    }

    case "UPDATE_PUBLIC_NOTE": {
      return {
        label: "Cập nhật nhận xét Phụ huynh",
        category: "ACADEMIC",
        badgeTone: "lavender",
        summary: `Nội dung: "${String(d.publicNote ?? "")}"`,
      };
    }

    case "UPDATE_INTERNAL_NOTE": {
      return {
        label: "Cập nhật ghi chú nội bộ",
        category: "ACADEMIC",
        badgeTone: "butter",
        summary: "Đã cập nhật ghi chú nội bộ dành riêng cho Giáo viên/Admin",
      };
    }

    case "UPDATE_STUDENT_STATUS": {
      const statusMap: Record<string, string> = {
        ACTIVE: "Đang học",
        PAUSED: "Tạm nghỉ",
        LEFT: "Đã nghỉ hẳn",
      };
      return {
        label: "Đổi trạng thái theo học",
        category: "ACCOUNT",
        badgeTone: "sky",
        summary: `Trạng thái trong ca: ${statusMap[String(d.nextStatus)] ?? String(d.nextStatus ?? "")}`,
      };
    }

    case "RESET_STUDENT_PASSWORD": {
      return {
        label: "Cấp lại mật khẩu Học sinh",
        category: "ACCOUNT",
        badgeTone: "lavender",
        summary: `Đã đặt lại mật khẩu cho tài khoản ${String(d.username ?? "")}`,
      };
    }

    default:
      return {
        label: actionType,
        category: "ACADEMIC",
        badgeTone: "lavender",
        summary: JSON.stringify(d),
      };
  }
}
