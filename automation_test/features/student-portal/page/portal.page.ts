import { type Locator, type Page } from "@playwright/test";

export class StudentPortalPageObject {
  readonly page: Page;
  readonly greetingBanner: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greetingBanner = page.getByText(/Chào, Nguyễn Văn Nam!/);
    this.logoutButton = page.getByRole("button", { name: "Đăng xuất" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/portal");
  }
}
