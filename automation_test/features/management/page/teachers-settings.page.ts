import { type Locator, type Page } from "@playwright/test";

export class TeachersSettingsPage {
  readonly page: Page;
  readonly addTeacherButton: Locator;
  readonly fullNameInput: Locator;
  readonly phoneInput: Locator;
  readonly usernameInput: Locator;
  readonly submitTeacherButton: Locator;
  readonly bankSelect: Locator;
  readonly bankAccountNoInput: Locator;
  readonly bankAccountNameInput: Locator;
  readonly saveSettingsButton: Locator;
  readonly qrPreviewImg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addTeacherButton = page.getByRole("button", {
      name: "Thêm Giáo viên",
    });
    this.fullNameInput = page.locator("#teacher-fullName");
    this.phoneInput = page.locator("#teacher-phone");
    this.usernameInput = page.locator("#teacher-username");
    this.submitTeacherButton = page.getByRole("button", {
      name: "Tạo tài khoản",
    });

    this.bankSelect = page.locator("#center-bankBin");
    this.bankAccountNoInput = page.locator("#center-bankAccountNo");
    this.bankAccountNameInput = page.locator("#center-bankAccountName");
    this.saveSettingsButton = page.getByRole("button", {
      name: "Lưu cài đặt Trung tâm",
    });
    this.qrPreviewImg = page.getByAltText("Mã VietQR xem trước");
  }

  async gotoTeachers(): Promise<void> {
    await this.page.goto("/management/teachers");
  }

  async gotoSettings(): Promise<void> {
    await this.page.goto("/management/settings");
  }

  async createTeacher(params: {
    fullName: string;
    phone: string;
    username: string;
  }): Promise<void> {
    await this.addTeacherButton.click();
    await this.fullNameInput.fill(params.fullName);
    await this.phoneInput.fill(params.phone);
    await this.usernameInput.fill(params.username);
    await this.submitTeacherButton.click();
  }

  async updateVietQrSettings(params: {
    bankBin: string;
    accountNo: string;
    accountName: string;
  }): Promise<void> {
    await this.bankSelect.selectOption(params.bankBin);
    await this.bankAccountNoInput.fill(params.accountNo);
    await this.bankAccountNameInput.fill(params.accountName);
    await this.saveSettingsButton.click();
  }
}
