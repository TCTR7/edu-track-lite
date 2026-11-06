import { type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly togglePasswordButton: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "EduTrack Lite" });
    this.usernameInput = page.locator("#login-username");
    this.passwordInput = page.locator("#login-password");
    this.togglePasswordButton = page.getByRole("button", {
      name: /Hiện mật khẩu|Ẩn mật khẩu/,
    });
    this.submitButton = page.getByRole("button", { name: "Đăng nhập" });
    this.errorAlert = page.locator('form [role="alert"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
