import { describe, expect, it } from "vitest";
import { hasRoleAccess } from "@/lib/auth";
import {
  buildVietQrImageUrl,
  buildVietQrTransferNote,
} from "@/lib/constants/banks";
import {
  getHomeRouteForRole,
  signSessionToken,
  verifySessionToken,
} from "@/lib/jwt";
import {
  buildUsernameSlug,
  formatZaloCredentialsMessage,
  generateRandomPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import {
  calculateRoundedSessionPrice,
  removeVietnameseTones,
} from "@/lib/utils";
import { isClassInSessionNow } from "@/lib/utils/schedule";

describe("Phase 1 – Core Auth, Permissions & Utility Logic", () => {
  it("signs and verifies JWT session tokens accurately", async () => {
    const token = await signSessionToken({
      userId: "u-123",
      username: "admin",
      fullName: "Nguyễn Minh Trí",
      role: "ADMIN",
      centerId: "c-456",
    });

    const verified = await verifySessionToken(token);
    expect(verified).toEqual({
      userId: "u-123",
      username: "admin",
      fullName: "Nguyễn Minh Trí",
      role: "ADMIN",
      centerId: "c-456",
    });

    const invalid = await verifySessionToken("tampered.token.value");
    expect(invalid).toBeNull();
  });

  it("enforces role hierarchy where ADMIN inherits 100% of TEACHER permissions", () => {
    expect(hasRoleAccess("ADMIN", ["TEACHER"])).toBe(true);
    expect(hasRoleAccess("ADMIN", ["ADMIN"])).toBe(true);
    expect(hasRoleAccess("TEACHER", ["ADMIN"])).toBe(false);
    expect(hasRoleAccess("TEACHER", ["TEACHER"])).toBe(true);
    expect(hasRoleAccess("STUDENT", ["TEACHER"])).toBe(false);
    expect(hasRoleAccess("OPERATOR", ["ADMIN", "TEACHER"])).toBe(false);
  });

  it("routes each role to its designated default home screen", () => {
    expect(getHomeRouteForRole("OPERATOR")).toBe("/operator/centers");
    expect(getHomeRouteForRole("ADMIN")).toBe("/classes");
    expect(getHomeRouteForRole("TEACHER")).toBe("/classes");
    expect(getHomeRouteForRole("STUDENT")).toBe("/portal");
  });

  it("generates unambiguous 6-character random passwords and hashes them", async () => {
    for (let i = 0; i < 25; i++) {
      const pwd = generateRandomPassword(6);
      expect(pwd).toHaveLength(6);
      expect(pwd).not.toMatch(/[01OIl]/);
    }

    const hash = await hashPassword("secret99");
    expect(await verifyPassword("secret99", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("normalizes Vietnamese names for student usernames and Zalo copy message", () => {
    expect(removeVietnameseTones("Đặng Thị Ánh Tuyết")).toBe(
      "Dang Thi Anh Tuyet"
    );
    expect(buildUsernameSlug("Đặng Thị Ánh Tuyết")).toBe("dangthianhtuyet");

    const msg = formatZaloCredentialsMessage({
      studentName: "Nguyễn Văn Nam",
      centerName: "Trung tâm Minh Trí",
      appUrl: "https://edutrack.vn",
      username: "nguyenvannam_24",
      plainPassword: "abc234",
    });
    expect(msg).toContain("nguyenvannam_24");
    expect(msg).toContain("abc234");
    expect(msg).toContain("https://edutrack.vn/login");
  });

  it("calculates rounded per-session deduction prices cleanly", () => {
    expect(calculateRoundedSessionPrice(800000, 16, 1000)).toBe(50000);
    expect(calculateRoundedSessionPrice(1000000, 12, 1000)).toBe(83000);
    expect(calculateRoundedSessionPrice(1000000, 12, 1)).toBe(83333);
  });

  it("builds valid VietQR transfer notes and image URLs", () => {
    const note = buildVietQrTransferNote({
      cycleNumber: 3,
      studentName: "Nguyễn Văn Nam",
      className: "Toán Lớp 4 - Ca 1",
    });
    expect(note).toBe("HP Ky 3 Nguyen Van Nam Toan Lop 4 Ca 1");

    const url = buildVietQrImageUrl({
      bankBin: "970436",
      bankAccountNo: "0071001234567",
      bankAccountName: "Nguyễn Minh Trí",
      amount: 750000,
      transferNote: note,
    });
    expect(url).toContain("https://img.vietqr.io/image/970436-0071001234567-compact2.png");
    expect(url).toContain("amount=750000");
    expect(url).toContain("accountName=NGUYEN+MINH+TRI");
  });

  it("detects active class schedule within +/-15 minute window", () => {
    const slots = [{ dayOfWeek: 2, startTime: "17:30", endTime: "19:00" }]; // Tuesday
    // 2026-11-03 is Tuesday
    expect(isClassInSessionNow(slots, new Date("2026-11-03T17:20:00"))).toBe(
      true
    );
    expect(isClassInSessionNow(slots, new Date("2026-11-03T19:10:00"))).toBe(
      true
    );
    expect(isClassInSessionNow(slots, new Date("2026-11-03T16:50:00"))).toBe(
      false
    );
  });
});
