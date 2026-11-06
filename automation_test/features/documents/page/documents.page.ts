import { type Locator, type Page } from "@playwright/test";

export class DocumentsPageObject {
  readonly page: Page;
  readonly openUploadButton: Locator;
  readonly searchInput: Locator;
  readonly titleInput: Locator;
  readonly gradeSelect: Locator;
  readonly fileInput: Locator;
  readonly submitUploadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openUploadButton = page.getByRole("button", {
      name: "Tải Tài liệu lên",
    });
    this.searchInput = page.getByLabel("Tìm kiếm tài liệu");
    this.titleInput = page.locator("#doc-title-input");
    this.gradeSelect = page.locator("#doc-grade-select");
    this.fileInput = page.locator("#doc-file-input");
    this.submitUploadButton = page.getByRole("button", {
      name: "Lưu vào Kho Tài liệu",
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("/documents");
  }

  async uploadSampleDocument(params: {
    title: string;
    grade: string;
    fileName: string;
    content: string;
  }): Promise<void> {
    await this.openUploadButton.click();
    await this.titleInput.fill(params.title);
    await this.gradeSelect.selectOption(params.grade);
    await this.fileInput.setInputFiles({
      name: params.fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from(params.content, "utf-8"),
    });
    await this.submitUploadButton.click();
  }
}
