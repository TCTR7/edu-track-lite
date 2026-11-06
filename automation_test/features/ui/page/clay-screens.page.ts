import { expect, type Locator, type Page } from "@playwright/test";

export class ClayScreensPage {
  constructor(readonly page: Page) {}

  async open(path: string) {
    await this.page.goto(path);
    await expect(this.page.locator("main").getByRole("heading", { level: 1 }).first()).toBeVisible();
  }

  async expectResponsive() {
    for (const width of [360, 390, 768, 1280]) {
      await this.page.setViewportSize({ width, height: 844 });
      const size = await this.page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(size.content, this.page.url() + " at " + width).toBeLessThanOrEqual(size.viewport);
    }
  }

  async expectTouchTarget(target: Locator) {
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  async closeDialogWithEscape() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await this.expectTouchTarget(dialog.getByRole("button", { name: "Đóng hộp thoại" }));
    await this.page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  }
}
