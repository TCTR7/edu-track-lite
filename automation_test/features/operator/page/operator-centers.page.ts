import { type Locator, type Page } from "@playwright/test";

export class OperatorCentersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly openCreateButton: Locator;
  readonly centerNameInput: Locator;
  readonly phoneInput: Locator;
  readonly adminFullNameInput: Locator;
  readonly adminUsernameInput: Locator;
  readonly submitCreateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Danh sách Trung tâm" });
    this.openCreateButton = page.getByRole("button", {
      name: "Tạo Trung tâm mới",
    });
    this.centerNameInput = page.locator("#centerName");
    this.phoneInput = page.locator("#phone");
    this.adminFullNameInput = page.locator("#adminFullName");
    this.adminUsernameInput = page.locator("#adminUsername");
    this.submitCreateButton = page.getByRole("button", {
      name: "Tạo Trung tâm",
      exact: true,
    });
  }

  async createCenter(params: {
    centerName: string;
    phone: string;
    adminFullName: string;
    adminUsername: string;
  }): Promise<void> {
    await this.openCreateButton.click();
    await this.centerNameInput.fill(params.centerName);
    await this.phoneInput.fill(params.phone);
    await this.adminFullNameInput.fill(params.adminFullName);
    await this.adminUsernameInput.fill(params.adminUsername);
    await this.submitCreateButton.click();
  }

  getCenterCard(centerName: string): Locator {
    return this.page
      .getByTestId("center-card")
      .filter({ hasText: centerName });
  }
}
