import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  getDocumentTypeBadge,
} from "../../app/(center)/documents/documents-client";
import {
  buildVietQrImageUrl,
  buildVietQrTransferNote,
} from "../constants/banks";

describe("Phase 4 – Documents Repository & Student Portal VietQR", () => {
  it("formats file sizes into human-readable B / KB / MB", () => {
    expect(formatFileSize(0)).toBe("—");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(204800)).toBe("200 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("identifies document badge types from MIME type and file URL", () => {
    expect(
      getDocumentTypeBadge("application/pdf", "/api/files/de-cuong.pdf").label
    ).toBe("PDF");
    expect(
      getDocumentTypeBadge(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "giao-an.docx"
      ).label
    ).toBe("WORD");
    expect(getDocumentTypeBadge("image/webp", "btvn.webp").label).toBe("ẢNH");
  });

  it("builds accent-free VietQR transfer notes and valid img.vietqr.io URLs", () => {
    const note = buildVietQrTransferNote({
      cycleNumber: 3,
      studentName: "Nguyễn Văn Nam",
      className: "Toán Lớp 4 - Ca 1",
    });
    expect(note).toBe("HP Ky 3 Nguyen Van Nam Toan Lop 4 Ca 1");

    const qrUrl = buildVietQrImageUrl({
      bankBin: "970436",
      bankAccountNo: "0071001234567",
      bankAccountName: "NGUYỄN MINH TRÍ",
      amount: 750000,
      transferNote: note,
    });
    expect(qrUrl).toContain("https://img.vietqr.io/image/970436-0071001234567-compact2.png");
    expect(qrUrl).toContain("amount=750000");
    expect(qrUrl).toContain("accountName=NGUYEN+MINH+TRI");
  });
});
