import { type Page } from "@playwright/test";
import { ClassesListPage } from "./classes-list.page";

export class ClassModalPage extends ClassesListPage {
  constructor(page: Page) { super(page); }

  get dialog() { return this.page.locator("dialog"); }
  get body() { return this.dialog.locator(".clay-modal-body"); }
  get closeButton() { return this.dialog.getByRole("button", { name: "Đóng hộp thoại" }); }

  async openEdit() {
    await this.page.getByRole("button", { name: /^Chỉnh sửa / }).first().click();
  }

  async resizeVisualViewport(height: number, offsetTop = 0) {
    await this.page.evaluate(({ height, offsetTop }) => {
      const viewport = window.visualViewport!;
      Object.defineProperties(viewport, {
        height: { configurable: true, value: height },
        offsetTop: { configurable: true, value: offsetTop },
      });
      viewport.dispatchEvent(new Event("resize"));
      viewport.dispatchEvent(new Event("scroll"));
    }, { height, offsetTop });
  }

  async swipeBody() {
    await this.body.evaluate(body => {
      for (const [type, clientY] of [["touchstart", 300], ["touchmove", 240]] as const) {
        const event = new Event(type, { bubbles: true });
        Object.defineProperty(event, "touches", { value: [{ clientY }] });
        body.dispatchEvent(event);
      }
    });
  }
}
