import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { DocumentsPageObject } from "../page/documents.page";

test.describe("Module Documents – Kho Tài liệu Dạy học nội bộ", () => {
  test("Tải tài liệu PDF lên kho, tìm kiếm không dấu tức thời, lọc theo Khối lớp và xóa tài liệu", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const docsPage = new DocumentsPageObject(page);
    await docsPage.goto();

    const suffix = Date.now().toString().slice(-5);
    const docTitle = `Đề cương Ôn tập Phân số Lớp 4 ${suffix}`;

    await docsPage.uploadSampleDocument({
      title: docTitle,
      grade: "4",
      fileName: `de-cuong-phan-so-${suffix}.pdf`,
      content: "%PDF-1.4 Sample EduTrack Document",
    });

    await expect(page.getByRole("status")).toContainText(
      `Đã tải lên tài liệu "${docTitle}" thành công.`
    );

    const card = page
      .getByTestId("document-card")
      .filter({ hasText: docTitle });
    await expect(card).toBeVisible();
    await expect(card).toContainText("PDF");
    await expect(card).toContainText("Khối Lớp 4");

    // Tìm kiếm không dấu tiếng Việt
    await docsPage.searchInput.fill(`de cuong on tap phan so lop 4 ${suffix}`);
    await expect(card).toBeVisible();

    // Lọc sang Lớp 5 -> thẻ Lớp 4 ẩn đi
    await page.getByRole("button", { name: "Lớp 5", exact: true }).click();
    await expect(card).toHaveCount(0);

    // Lọc lại Lớp 4 -> thẻ xuất hiện lại và xóa tài liệu
    await page.getByRole("button", { name: "Lớp 4", exact: true }).click();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: `Xóa tài liệu ${docTitle}` }).click();
    await expect(card).toHaveCount(0);
  });
});
