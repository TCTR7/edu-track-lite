import { type Locator, type Page } from "@playwright/test";

export class ClassesListPage {
  readonly page: Page;
  readonly createClassButton: Locator;
  readonly classNameInput: Locator;
  readonly sessionsInput: Locator;
  readonly tuitionInput: Locator;
  readonly deductionInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createClassButton = page.getByRole("button", {
      name: "Tạo Ca học mới",
    });
    this.classNameInput = page.locator("#class-name");
    this.sessionsInput = page.locator("#class-sessions");
    this.tuitionInput = page.locator("#class-tuition");
    this.deductionInput = page.locator("#class-deduction");
    this.submitButton = page.getByRole("button", {
      name: "Tạo Ca học",
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("/classes");
  }

  async createClass(params: {
    name: string;
    sessionsPerCycle: number;
    tuitionPerCycle: number;
  }): Promise<void> {
    await this.createClassButton.click();
    await this.classNameInput.fill(params.name);
    await this.sessionsInput.fill(String(params.sessionsPerCycle));
    await this.tuitionInput.fill(String(params.tuitionPerCycle));
    await this.submitButton.click();
  }

  async openClassByName(name: string): Promise<void> {
    await this.page.getByRole("heading", { name }).click();
  }
}
