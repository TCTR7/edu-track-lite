import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { TeachersSettingsPage } from "../page/teachers-settings.page";

test.describe("Module Management – Giáo viên & Cấu hình VietQR Trung tâm", () => {
  test("Admin tạo Giáo viên phụ giảng và cấu hình tài khoản ngân hàng VietQR", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const mgmtPage = new TeachersSettingsPage(page);

    await mgmtPage.gotoTeachers();
    const suffix = Date.now().toString().slice(-5);
    const teacherName = `Thầy Phạm Quốc Bảo ${suffix}`;
    const teacherUser = `thaybao_${suffix}`;

    await mgmtPage.createTeacher({
      fullName: teacherName,
      phone: "0912345999",
      username: teacherUser,
    });

    await expect(
      page.getByText(`Thông tin đăng nhập của ${teacherName}`)
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: teacherName })
    ).toBeVisible();

    // Sang trang Cài đặt VietQR & Làm tròn
    await mgmtPage.gotoSettings();
    await mgmtPage.updateVietQrSettings({
      bankBin: "970436", // Vietcombank
      accountNo: "0071009998887",
      accountName: "NGUYEN MINH TRI",
    });

    await expect(page.getByRole("status")).toContainText(
      "Đã lưu cài đặt trung tâm"
    );
    await expect(mgmtPage.qrPreviewImg).toBeVisible();
  });
});
