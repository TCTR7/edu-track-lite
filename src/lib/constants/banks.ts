import { removeVietnameseTones } from "@/lib/utils";

export interface BankOption {
  bin: string;
  shortName: string;
  name: string;
}

export const VIETNAMESE_BANKS: BankOption[] = [
  { bin: "970436", shortName: "Vietcombank", name: "NH TMCP Ngoại thương Việt Nam" },
  { bin: "970422", shortName: "MBBank", name: "NH TMCP Quân đội" },
  { bin: "970407", shortName: "Techcombank", name: "NH TMCP Kỹ thương Việt Nam" },
  { bin: "970415", shortName: "VietinBank", name: "NH TMCP Công thương Việt Nam" },
  { bin: "970418", shortName: "BIDV", name: "NH TMCP Đầu tư và Phát triển Việt Nam" },
  { bin: "970405", shortName: "Agribank", name: "NH Nông nghiệp và PTNT Việt Nam" },
  { bin: "970416", shortName: "ACB", name: "NH TMCP Á Châu" },
  { bin: "970432", shortName: "VPBank", name: "NH TMCP Việt Nam Thịnh Vượng" },
  { bin: "970423", shortName: "TPBank", name: "NH TMCP Tiên Phong" },
  { bin: "970403", shortName: "Sacombank", name: "NH TMCP Sài Gòn Thương Tín" },
  { bin: "970441", shortName: "VIB", name: "NH TMCP Quốc tế Việt Nam" },
  { bin: "970448", shortName: "OCB", name: "NH TMCP Phương Đông" },
  { bin: "970437", shortName: "HDBank", name: "NH TMCP Phát triển TP.HCM" },
  { bin: "970443", shortName: "SHB", name: "NH TMCP Sài Gòn - Hà Nội" },
];

export function getBankNameByBin(bin: string | null | undefined): string {
  if (!bin) return "Chưa cấu hình";
  const found = VIETNAMESE_BANKS.find((b) => b.bin === bin);
  return found ? `${found.shortName} (${found.bin})` : bin;
}

export function buildVietQrTransferNote(params: {
  cycleNumber: number;
  studentName: string;
  className: string;
}): string {
  const raw = `HP Ky ${params.cycleNumber} ${params.studentName} ${params.className}`;
  return removeVietnameseTones(raw)
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

export function buildVietQrImageUrl(params: {
  bankBin: string;
  bankAccountNo: string;
  bankAccountName?: string | null;
  amount: number;
  transferNote: string;
}): string {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(
    params.bankBin
  )}-${encodeURIComponent(params.bankAccountNo)}-compact2.png`;
  const search = new URLSearchParams();
  if (params.amount > 0) {
    search.set("amount", String(Math.round(params.amount)));
  }
  if (params.transferNote) {
    search.set("addInfo", params.transferNote);
  }
  if (params.bankAccountName) {
    search.set("accountName", removeVietnameseTones(params.bankAccountName).toUpperCase());
  }
  return `${base}?${search.toString()}`;
}
