import { expect, type Page } from "@playwright/test";

export class ClayLayoutPage {
  constructor(readonly page: Page) {}

  get hero() { return this.page.locator("main section").first(); }
  get createButton() { return this.page.getByRole("button", { name: "Tạo Ca học mới", exact: true }); }
  get dialog() { return this.page.getByRole("dialog", { name: "Tạo Ca học mới", exact: true }); }

  async expectNoHorizontalOverflow() {
    const sizes = await this.page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
  }

  async expectTouchTarget(locator: ReturnType<Page["getByRole"]>) {
    const bounds = await locator.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }

  async openCreateDialog() {
    await this.createButton.click();
    await expect(this.dialog).toBeVisible();
    await this.expectTouchTarget(this.dialog.getByRole("button", { name: "Đóng hộp thoại" }));
    const bounds = await this.dialog.boundingBox();
    const viewport = this.page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  }
}
