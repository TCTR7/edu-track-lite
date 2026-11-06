import { expect, test } from "@playwright/test";
import { TEST_ACCOUNTS } from "../../../common/test-data";
import { LoginPage } from "../page/login.page";

test.describe("Module Auth – Đăng nhập & Phân quyền 4 Role", () => {
  test("Hiển thị lỗi khi nhập sai mật khẩu và cho phép bật/tắt hiển thị mật khẩu", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.passwordInput).toHaveAttribute("type", "password");

    await loginPage.togglePasswordButton.click();
    await expect(loginPage.passwordInput).toHaveAttribute("type", "text");

    await loginPage.login("admin", "sai_mat_khau_123");
    await expect(loginPage.errorAlert).toContainText(
      "Tên đăng nhập hoặc mật khẩu không chính xác"
    );
  });

  test("Đăng nhập thành công với cả 4 Role (Operator, Admin, Giáo viên, Học sinh)", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    for (const roleKey of ["operator", "admin", "teacher", "student"] as const) {
      const acc = TEST_ACCOUNTS[roleKey];
      await loginPage.goto();
      await loginPage.login(acc.username, acc.password);
      await expect(page).toHaveURL(new RegExp(acc.defaultRedirectPath));
      await page.context().clearCookies();
    }
  });
});
