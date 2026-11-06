import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { ClayLayoutPage } from "../page/clay-layout.page";

test.describe("Clay UI – Ca học", () => {
  test("Admin: responsive, minh họa, vùng chạm và hộp thoại bàn phím", async ({ page }) => {
    await loginAs(page, "admin");
    const layout = new ClayLayoutPage(page);
    await expect(layout.hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".stat-card").filter({ has: page.locator(".icon-chip") })).toHaveCount(4);
    await expect.poll(() => layout.hero.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await layout.expectNoHorizontalOverflow();
      await layout.expectTouchTarget(layout.createButton);
      await layout.expectTouchTarget(page.getByRole("button", { name: /^Chỉnh sửa / }).first());
      await layout.openCreateDialog();
      await page.keyboard.press("Escape");
      await expect(layout.dialog).not.toBeVisible();
      await expect(layout.createButton).toBeFocused();
    }

    await page.setViewportSize({ width: 390, height: 500 });
    await layout.openCreateDialog();
    await layout.dialog.getByRole("button", { name: "Đóng hộp thoại" }).click();
    await expect(layout.dialog).not.toBeVisible();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await layout.createButton.dispatchEvent("mousedown");
    await expect(layout.createButton).toHaveCSS("transition-duration", "0s");
    await page.setViewportSize({ width: 1280, height: 844 });

    // Closing by the backdrop still works after the modal layout changes.
    await layout.openCreateDialog();
    await page.mouse.click(1, 1);
    await expect(layout.dialog).not.toBeVisible();

    const cardLink = page.getByTestId("class-card").first().getByRole("link");
    await cardLink.focus();
    await expect(cardLink).toBeFocused();
    await cardLink.press("Enter");
    await expect(page).toHaveURL(/\/classes\/[^/]+$/);
    await expect(page.getByRole("tab", { name: /Điểm danh & \+1/ })).toBeVisible();
  });

  test("Giáo viên: không có nút quản trị, CTA vẫn dùng được khi minh họa tải lỗi", async ({ page }) => {
    await page.route("**/_next/image?*", route => route.abort());
    await loginAs(page, "teacher");
    const layout = new ClayLayoutPage(page);
    await expect(layout.hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(layout.createButton).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Chỉnh sửa / })).toHaveCount(0);
    await layout.expectNoHorizontalOverflow();
    const cardLink = page.getByTestId("class-card").first().getByRole("link");
    await cardLink.click();
    await expect(page).toHaveURL(/\/classes\/[^/]+$/);
    await expect(page.getByRole("tab", { name: /Điểm danh & \+1/ })).toBeVisible();
  });
});
