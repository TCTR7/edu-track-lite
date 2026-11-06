import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { OperatorCentersPage } from "../page/operator-centers.page";

test.describe("Module Operator – Quản lý Trung tâm & Tài khoản Admin", () => {
  test("Tạo Trung tâm mới, sinh tài khoản Admin tự động, Khóa và Mở khóa Trung tâm", async ({
    page,
  }) => {
    await loginAs(page, "operator");
    const operatorPage = new OperatorCentersPage(page);

    await expect(operatorPage.heading).toBeVisible();

    const suffix = Date.now().toString().slice(-5);
    const centerName = `Trung Tâm Toán Ánh Sao ${suffix}`;
    const adminUsername = `anhsao_admin_${suffix}`;

    await operatorPage.createCenter({
      centerName,
      phone: "0909888777",
      adminFullName: "Cô Lê Ánh Sao",
      adminUsername,
    });

    // Kiểm tra banner cấp mật khẩu tự động xuất hiện
    await expect(
      page.getByText(`Tài khoản Admin cho "${centerName}"`)
    ).toBeVisible();
    await expect(page.getByText(adminUsername).first()).toBeVisible();

    const card = operatorPage.getCenterCard(centerName);
    await expect(card).toBeVisible();
    await expect(card.getByText("Đang hoạt động")).toBeVisible();

    // Khóa trung tâm
    await card.getByRole("button", { name: "Khóa trung tâm" }).click();
    await expect(card.getByText("Đã khóa toàn TT")).toBeVisible();

    // Mở khóa lại
    await card.getByRole("button", { name: "Mở khóa" }).click();
    await expect(card.getByText("Đang hoạt động")).toBeVisible();
  });
});
