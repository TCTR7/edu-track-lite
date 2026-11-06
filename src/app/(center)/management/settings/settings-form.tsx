"use client";

import { useActionState, useState } from "react";
import { QrCode, Save } from "lucide-react";
import {
  updateCenterSettingsAction,
  type SettingsActionState,
} from "@/actions/management-actions";
import {
  buildVietQrImageUrl,
  VIETNAMESE_BANKS,
} from "@/lib/constants/banks";

interface CenterSettingsData {
  name: string;
  phone: string | null;
  bankBin: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  roundingUnit: number;
}

const ROUNDING_OPTIONS = [
  { value: 1000, label: "Làm tròn đến 1.000 đ (Khuyên dùng)" },
  { value: 5000, label: "Làm tròn đến 5.000 đ" },
  { value: 10000, label: "Làm tròn đến 10.000 đ" },
  { value: 1, label: "Giữ nguyên từng đồng (Không làm tròn)" },
];

const initialState: SettingsActionState = {};

export function CenterSettingsForm({
  initialData,
}: {
  initialData: CenterSettingsData;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCenterSettingsAction,
    initialState
  );

  const [bankBin, setBankBin] = useState(initialData.bankBin ?? "");
  const [bankAccountNo, setBankAccountNo] = useState(
    initialData.bankAccountNo ?? ""
  );
  const [bankAccountName, setBankAccountName] = useState(
    initialData.bankAccountName ?? ""
  );
  const [roundingUnit, setRoundingUnit] = useState(initialData.roundingUnit);

  const previewQrUrl =
    bankBin && bankAccountNo
      ? buildVietQrImageUrl({
          bankBin,
          bankAccountNo,
          bankAccountName,
          amount: 750000,
          transferNote: "HP Ky 1 Nguyen Van Nam Toan 4",
        })
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        action={formAction}
        className="space-y-5 clay-card p-5 sm:p-6 lg:col-span-3"
      >
        {state.error && (
          <div
            role="alert"
            aria-live="polite"
            className="clay-notice clay-notice-danger px-4 py-3 text-sm font-medium"
          >
            {state.error}
          </div>
        )}
        {state.success && (
          <div
            role="status"
            aria-live="polite"
            className="clay-notice clay-notice-success px-4 py-3 text-sm font-medium"
          >
            {state.success}
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="text-base font-bold text-slate-900">
            1. Thông tin Trung tâm
          </legend>

          <div>
            <label
              htmlFor="center-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tên Trung tâm / Lớp học *
            </label>
            <input
              id="center-name"
              name="name"
              type="text"
              required
              defaultValue={initialData.name}
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div>
            <label
              htmlFor="center-phone"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Số điện thoại liên hệ Phụ huynh
            </label>
            <input
              id="center-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={initialData.phone ?? ""}
              placeholder="VD: 0909123456"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>
        </fieldset>

        <hr className="border-slate-100" />

        <fieldset className="space-y-4">
          <legend className="text-base font-bold text-slate-900">
            2. Tài khoản Ngân hàng Nhận Học phí (VietQR)
          </legend>
          <p className="text-xs text-slate-600">
            Khi cấu hình mục này, Cổng Phụ huynh sẽ tự động hiển thị mã QR điền
            sẵn đúng số tiền cần đóng và nội dung chuyển khoản của từng học sinh.
          </p>

          <div>
            <label
              htmlFor="center-bankBin"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Ngân hàng thụ hưởng
            </label>
            <select
              id="center-bankBin"
              name="bankBin"
              value={bankBin}
              onChange={(e) => setBankBin(e.target.value)}
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            >
              <option value="">-- Chọn ngân hàng --</option>
              {VIETNAMESE_BANKS.map((bank) => (
                <option key={bank.bin} value={bank.bin}>
                  {bank.shortName} – {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="center-bankAccountNo"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Số tài khoản ngân hàng
              </label>
              <input
                id="center-bankAccountNo"
                name="bankAccountNo"
                type="text"
                inputMode="numeric"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="VD: 0071001234567"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="center-bankAccountName"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tên chủ tài khoản (Không dấu)
              </label>
              <input
                id="center-bankAccountName"
                name="bankAccountName"
                type="text"
                autoCorrect="off"
                spellCheck={false}
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="VD: NGUYEN MINH TRI"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 uppercase"
              />
            </div>
          </div>
        </fieldset>

        <hr className="border-slate-100" />

        <fieldset className="space-y-3">
          <legend className="text-base font-bold text-slate-900">
            3. Quy tắc làm tròn đơn giá 1 buổi học
          </legend>
          <p className="text-xs text-slate-600">
            Áp dụng khi chia Học phí chu kỳ cho Số buổi bị lẻ (VD: 1.000.000 đ /
            12 buổi = 83.000 đ/buổi).
          </p>

          <div className="space-y-2">
            {ROUNDING_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="roundingUnit"
                  value={opt.value}
                  checked={roundingUnit === opt.value}
                  onChange={() => setRoundingUnit(opt.value)}
                  className="h-4 w-4 accent-brand-700"
                />
                <span className="text-sm font-medium text-slate-800">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Đang lưu cài đặt..." : "Lưu cài đặt Trung tâm"}
        </button>
      </form>

      {/* Live VietQR Preview Card */}
      <div className="clay-card p-5 sm:p-6 lg:col-span-2">
        <div className="flex items-center gap-2 text-slate-900">
          <QrCode className="h-5 w-5 text-brand-700" />
          <h2 className="text-base font-bold">Xem trước Mã VietQR Phụ huynh</h2>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Minh họa hóa đơn mẫu 750.000 đ khi phụ huynh bấm thanh toán trên điện
          thoại.
        </p>

        {previewQrUrl ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewQrUrl}
              alt="Mã VietQR xem trước"
              className="w-full max-w-[260px] rounded-xl bg-white p-2 shadow-xs"
            />
            <p className="mt-3 text-center text-xs font-medium text-slate-600">
              Nội dung tự động:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-brand-800">
                HP Ky 1 Nguyen Van Nam Toan 4
              </code>
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            Chọn Ngân hàng và nhập Số tài khoản để xem trước mã QR tự động.
          </div>
        )}
      </div>
    </div>
  );
}
