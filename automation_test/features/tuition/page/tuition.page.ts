import { type Locator, type Page } from "@playwright/test";

export class TuitionPageObject {
  readonly page: Page;
  readonly tabUnpaid: Locator;
  readonly tabReconciliation: Locator;
  readonly tabPaid: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tabUnpaid = page.getByRole("tab", { name: /Chưa đóng/ });
    this.tabReconciliation = page.getByRole("tab", {
      name: /Đối soát theo ngày/,
    });
    this.tabPaid = page.getByRole("tab", { name: /Đã thu/ });
    this.searchInput = page.getByLabel("Tìm kiếm hóa đơn học phí");
  }

  async goto(): Promise<void> {
    await this.page.goto("/tuition");
  }

  getUnpaidCardByStudent(studentName: string): Locator {
    return this.page
      .getByTestId("unpaid-bill-card")
      .filter({ hasText: studentName });
  }

  async adjustBill(
    studentName: string,
    adjustmentAmount: string,
    note: string
  ): Promise<void> {
    const card = this.getUnpaidCardByStudent(studentName);
    await card.getByRole("button", { name: "Điều chỉnh (+/-)" }).click();
    await this.page.locator("#adj-amount-input").fill(adjustmentAmount);
    await this.page.locator("#adj-note-input").fill(note);
    await this.page.getByRole("button", { name: "Lưu điều chỉnh" }).click();
  }

  async collectCash(studentName: string): Promise<void> {
    const card = this.getUnpaidCardByStudent(studentName);
    await card.getByRole("button", { name: "Thu Tiền mặt" }).click();
  }

  async collectTransfer(studentName: string): Promise<void> {
    const card = this.getUnpaidCardByStudent(studentName);
    await card.getByRole("button", { name: "Thu Chuyển khoản" }).click();
  }
}
