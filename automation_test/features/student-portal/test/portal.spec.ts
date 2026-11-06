import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { SEEDED_CLASSES } from "../../../common/test-data";
import { StudentPortalPageObject } from "../page/portal.page";

test.describe("Module Student Portal – Cổng Học sinh & Phụ huynh (1 Tài khoản Đa môn & Bảo mật Ghi chú)", () => {
  test("Học sinh xem được nhiều ca học trên 1 tài khoản và tuyệt đối không lộ internal_note", async ({
    page,
  }) => {
    // 1. Admin vào ca Toán Lớp 4 ghi thử cả public_note lẫn internal_note cho Nguyễn Văn Nam
    await loginAs(page, "admin");
    await page.getByRole("heading", { name: SEEDED_CLASSES.math4 }).click();
    await page.getByRole("tab", { name: /Học sinh/ }).click();
    await page.getByRole("button", { name: /Nguyễn Văn Nam/ }).click();

    const publicText = "Nam chăm ngoan, làm đầy đủ bài tập về nhà.";
    const secretInternalText = "SECRET_INTERNAL_NOTE_KHONG_HIEN_THI_CHO_PHU_HUYNH";

    await page.locator("#student-public-note").fill(publicText);
    await page.locator("#student-internal-note").fill(secretInternalText);
    await page
      .getByRole("button", { name: "Lưu nhận xét & trạng thái" })
      .click();
    await expect(page.getByRole("status")).toContainText("Đã lưu hồ sơ");
    await page.getByRole("button", { name: "Đóng hộp thoại" }).click();

    // 2. Đăng xuất Admin và đăng nhập bằng tài khoản Học sinh Nguyễn Văn Nam
    await page.context().clearCookies();
    await loginAs(page, "student");

    const portalPage = new StudentPortalPageObject(page);
    await expect(portalPage.greetingBanner).toBeVisible();

    // Kiểm tra thanh chuyển đổi đa môn học (Toán Lớp 4 & Tiếng Anh Lớp 6)
    await expect(
      page.getByRole("link", { name: SEEDED_CLASSES.math4 })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: SEEDED_CLASSES.english6 })
    ).toBeVisible();

    // Kiểm tra hiển thị public_note nhưng tuyệt đối không có secretInternalText trong DOM
    await expect(page.getByText(publicText)).toBeVisible();
    const htmlContent = await page.content();
    expect(htmlContent).not.toContain(secretInternalText);

    // Kiểm tra chuyển qua lại 3 tab trên Cổng Học sinh (Tổng quan & Phí, BTVN, Kết quả học tập)
    await page.getByRole("tab", { name: /BTVN/ }).click();
    await page.getByRole("tab", { name: /Kết quả học tập/ }).click();
    await expect(
      page.getByText(/Bảng điểm Kiểm tra định kỳ/)
    ).toBeVisible();
    await expect(page.getByText(/Thống kê Chuyên cần/)).toBeVisible();
  });
});
