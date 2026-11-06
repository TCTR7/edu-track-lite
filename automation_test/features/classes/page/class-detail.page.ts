import { type Locator, type Page } from "@playwright/test";

export class ClassDetailPage {
  readonly page: Page;
  readonly tabAttendance: Locator;
  readonly tabHomework: Locator;
  readonly tabStudents: Locator;
  readonly tabTuition: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tabAttendance = page.getByRole("tab", { name: /Điểm danh & \+1/ });
    this.tabHomework = page.getByRole("tab", { name: /BTVN/ });
    this.tabStudents = page.getByRole("tab", { name: /Học sinh/ });
    this.tabTuition = page.getByRole("tab", { name: /Kỳ học phí/ });
  }

  async switchToStudentsTab(): Promise<void> {
    await this.tabStudents.click();
  }

  async switchToAttendanceTab(): Promise<void> {
    await this.tabAttendance.click();
  }

  async switchToTuitionTab(): Promise<void> {
    await this.tabTuition.click();
  }

  async addNewStudent(fullName: string, phone: string): Promise<void> {
    await this.page
      .getByRole("button", { name: "Thêm Học sinh vào Ca" })
      .click();
    await this.page.locator("#new-student-name").fill(fullName);
    await this.page.locator("#new-student-phone").fill(phone);
    await this.page
      .getByRole("button", { name: "Tạo & Lấy thông tin Zalo" })
      .click();
  }

  async openStudentProfile(studentName: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(studentName) }).click();
  }

  async saveStudentNotes(params: {
    publicNote: string;
    internalNote: string;
  }): Promise<void> {
    await this.page.locator("#student-public-note").fill(params.publicNote);
    await this.page.locator("#student-internal-note").fill(params.internalNote);
    await this.page
      .getByRole("button", { name: "Lưu nhận xét & trạng thái" })
      .click();
  }

  async addTestScore(title: string, score: string): Promise<void> {
    await this.page.getByLabel("Tên bài kiểm tra").fill(title);
    await this.page.getByLabel("Điểm số").fill(score);
    await this.page.getByRole("button", { name: "Thêm điểm kiểm tra" }).click();
  }

  async closeModal(): Promise<void> {
    await this.page.getByRole("button", { name: "Đóng hộp thoại" }).click();
  }

  async startTodayAttendance(): Promise<void> {
    await this.page
      .getByRole("button", { name: /Bắt đầu Điểm danh hôm nay/ })
      .click();
  }
}
