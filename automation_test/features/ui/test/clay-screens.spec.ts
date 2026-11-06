import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { ClayScreensPage } from "../page/clay-screens.page";

test.describe("Clay UI – toàn bộ phân hệ", () => {
  test("Admin: các màn hình không tràn ngang, lọc dữ liệu và modal vẫn hoạt động", async ({ page }) => {
    await loginAs(page, "admin");
    const screens = new ClayScreensPage(page);
    const classPath = await page.getByTestId("class-card").first().getByRole("link").getAttribute("href");
    for (const path of [classPath!, "/tuition", "/students", "/documents", "/management", "/management/teachers", "/management/settings", "/management/audit-logs", "/account"]) {
      await screens.open(path);
      await screens.expectResponsive();
    }
    await screens.open("/documents");
    await page.setViewportSize({ width: 360, height: 844 });
    const grade = page.getByRole("button", { name: "Lớp 1", exact: true });
    await screens.expectTouchTarget(grade);
    await grade.click();
    await expect(grade).toHaveAttribute("aria-pressed", "true");
    await screens.open("/tuition");
    await page.getByRole("tab", { name: /Đối soát theo ngày/ }).click();
    await expect(page.getByText("Bảng Đối soát Tiền mặt & Chuyển khoản")).toBeVisible();
    await screens.expectResponsive();
    await page.getByRole("tab", { name: /Chưa đóng/ }).click();
    const search = page.getByRole("searchbox", { name: "Tìm kiếm hóa đơn học phí" });
    await search.fill("NO_MATCH_UI_REGRESSION");
    await expect(page.getByText("Không có hóa đơn chưa đóng nào khớp bộ lọc")).toBeVisible();
    await search.clear();
    await expect(page.getByTestId("unpaid-bill-card").first()).toBeVisible();
    await page.setViewportSize({ width: 360, height: 640 });
    const bill = page.getByTestId("unpaid-bill-card").first();
    await bill.getByRole("button", { name: /Điều chỉnh/ }).click();
    await screens.closeDialogWithEscape();
  });

  test("Operator: điều hướng và form tạo trung tâm trên màn hình nhỏ", async ({ page }) => {
    await loginAs(page, "operator");
    const screens = new ClayScreensPage(page);
    await screens.expectResponsive();
    await page.setViewportSize({ width: 360, height: 640 });
    const create = page.getByRole("button", { name: "Tạo Trung tâm mới" });
    await screens.expectTouchTarget(create);
    await create.click();
    await screens.closeDialogWithEscape();
    await screens.open("/operator/account");
    await screens.expectResponsive();
  });

  test("Học sinh: chuyển môn, tab và đổi mật khẩu với vùng chạm đủ lớn", async ({ page }) => {
    await loginAs(page, "student");
    const screens = new ClayScreensPage(page);
    await screens.expectResponsive();
    await page.setViewportSize({ width: 360, height: 844 });
    const classes = page.locator('header a[href^="/portal?classId="]');
    await expect(classes).toHaveCount(2);
    await classes.nth(1).click();
    await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible();
    for (const name of [/BTVN/, /Kết quả học tập/, /Tổng quan/]) {
      const tab = page.getByRole("tab", { name });
      await screens.expectTouchTarget(tab);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }
    const change = page.getByRole("button", { name: "Đổi mật khẩu", exact: true });
    await screens.expectTouchTarget(change);
    await change.click();
    await screens.closeDialogWithEscape();
  });
});
