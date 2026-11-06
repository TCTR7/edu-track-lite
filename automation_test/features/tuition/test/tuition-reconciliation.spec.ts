import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { ClassesListPage } from "../../classes/page/classes-list.page";
import { ClassDetailPage } from "../../classes/page/class-detail.page";
import { TuitionPageObject } from "../page/tuition.page";

test.describe("Module Tuition & Audit Log – Thu Học phí, Đối soát Tiền mặt/Chuyển khoản & Nhật ký Hệ thống", () => {
  test("Điều chỉnh giảm phí, thu Tiền mặt, kiểm tra bảng Đối soát người thu, Hoàn tác và kiểm tra Audit Log", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const classesList = new ClassesListPage(page);
    const classDetail = new ClassDetailPage(page);
    const tuitionPage = new TuitionPageObject(page);

    const suffix = Date.now().toString().slice(-5);
    const className = `Toán Nâng Cao ${suffix}`;
    const studentName = `Lê Hoàng Bách ${suffix}`;

    // 1. Tạo nhanh Ca học 1 buổi/kỳ (600.000đ) + thêm học sinh + điểm danh chốt kỳ
    await classesList.createClass({
      name: className,
      sessionsPerCycle: 1,
      tuitionPerCycle: 600000,
    });
    await classesList.openClassByName(className);
    await classDetail.switchToStudentsTab();
    await classDetail.addNewStudent(studentName, "0977111222");
    await classDetail.switchToAttendanceTab();
    await classDetail.startTodayAttendance();
    await expect(page.getByRole("status")).toContainText(
      "Đã hoàn tất buổi cuối của Kỳ 1"
    );

    // 2. Mở màn hình Học phí & Đối soát (/tuition)
    await tuitionPage.goto();
    const billCard = tuitionPage.getUnpaidCardByStudent(studentName);
    await expect(billCard).toBeVisible();
    await expect(billCard).toContainText("600.000");

    // 3. Điều chỉnh giảm 50.000đ (còn 550.000đ)
    await tuitionPage.adjustBill(
      studentName,
      "-50000",
      "Hỗ trợ học bổng đầu kỳ"
    );
    await expect(billCard).toContainText("550.000");
    await expect(billCard).toContainText("Hỗ trợ học bổng đầu kỳ");

    // 4. Bấm Thu Tiền mặt 1 chạm
    await tuitionPage.collectCash(studentName);
    await expect(page.getByRole("status")).toContainText("Đã xác nhận thu");

    // 5. Sang tab Đối soát theo ngày kiểm tra bảng Tiền mặt đang giữ & nút Hủy thu
    await tuitionPage.tabReconciliation.click();
    await expect(
      page.getByText("Bảng Đối soát Tiền mặt & Chuyển khoản")
    ).toBeVisible();
    await expect(page.getByText(studentName).first()).toBeVisible();

    // Hủy thu để chuyển sang Thu Chuyển khoản
    await page
      .locator("div.py-3")
      .filter({ hasText: studentName })
      .getByRole("button", { name: "Hủy thu" })
      .click();
    await page.locator("#revert-reason-input").fill("Đổi sang chuyển khoản");
    await page.getByRole("button", { name: "Xác nhận hủy thu" }).click();
    await expect(page.getByRole("status")).toContainText(
      `Đã hoàn tác hóa đơn của em ${studentName}`
    );

    // Quay lại tab Chưa đóng -> Thu Chuyển khoản
    await tuitionPage.tabUnpaid.click();
    await tuitionPage.collectTransfer(studentName);
    await expect(page.getByRole("status")).toContainText("Chuyển khoản");

    // 6. Mở trang Nhật ký hoạt động (/management/audit-logs) kiểm tra vết lưu
    await page.goto("/management/audit-logs");
    await expect(
      page.getByRole("heading", { name: "Nhật ký hoạt động (Audit Log)" })
    ).toBeVisible();
    await expect(
      page.getByText("Thu học phí (Chuyển khoản)").first()
    ).toBeVisible();
    await expect(
      page.getByText("Hoàn tác / Hủy thu học phí").first()
    ).toBeVisible();
    await expect(page.getByText("Điều chỉnh học phí").first()).toBeVisible();
  });
});
