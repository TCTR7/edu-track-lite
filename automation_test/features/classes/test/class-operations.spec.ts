import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { ClassesListPage } from "../page/classes-list.page";
import { ClassDetailPage } from "../page/class-detail.page";

test.describe("Module Classes – Tạo Ca học, Học sinh, Điểm danh 1 chạm & Tự động chốt Kỳ Học phí", () => {
  test("Tạo Ca học chu kỳ 1 buổi, thêm học sinh, ghi chú công khai/nội bộ, chấm điểm kiểm tra và điểm danh chốt kỳ", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const classesList = new ClassesListPage(page);
    const classDetail = new ClassDetailPage(page);

    const suffix = Date.now().toString().slice(-5);
    const className = `Lớp Luyện Đề Cấp Tốc ${suffix}`;
    const studentName = `Trần Minh Khôi ${suffix}`;

    // 1. Tạo Ca học mới với chu kỳ 1 buổi (để kiểm thử tự động chốt kỳ ngay khi điểm danh)
    await classesList.createClass({
      name: className,
      sessionsPerCycle: 1,
      tuitionPerCycle: 500000,
    });

    await expect(page.getByRole("heading", { name: className })).toBeVisible();
    await classesList.openClassByName(className);

    // 2. Thêm học sinh mới vào Ca học & kiểm tra sinh tài khoản Zalo
    await classDetail.switchToStudentsTab();
    await classDetail.addNewStudent(studentName, "0988777666");

    await expect(
      page.getByText(`Tài khoản của em ${studentName}`)
    ).toBeVisible();

    // 3. Mở Hồ sơ Học tập: nhập Public Note, Internal Note & 2 bài kiểm tra định kỳ
    await classDetail.openStudentProfile(studentName);
    await classDetail.saveStudentNotes({
      publicNote: "Con tiếp thu nhanh và hăng hái phát biểu.",
      internalNote: "Ghi chú mật: Phụ huynh xin đóng học phí vào ngày 10.",
    });
    await expect(page.getByRole("status")).toContainText(
      "Đã lưu hồ sơ và ghi chú học sinh."
    );

    await classDetail.addTestScore("Kiểm tra 15p Đại số", "8.0");
    await expect(page.getByText("Kiểm tra 15p Đại số")).toBeVisible();

    await classDetail.addTestScore("Kiểm tra Giữa kỳ", "9.5");
    await expect(page.getByText("Kiểm tra Giữa kỳ")).toBeVisible();

    await classDetail.closeModal();

    // Kiểm tra huy hiệu đánh giá tự động trên thẻ học sinh ("Đang tiến bộ")
    await expect(page.getByText(/Đang tiến bộ/).first()).toBeVisible();

    // 4. Điểm danh 1 chạm (buổi 1/1 -> Tự động chốt Kỳ 1 và lập bảng thu học phí)
    await classDetail.switchToAttendanceTab();
    await classDetail.startTodayAttendance();

    await expect(page.getByRole("status")).toContainText(
      "Đã hoàn tất buổi cuối của Kỳ 1"
    );

    // Thử bấm +1 điểm khuyến khích và đổi trạng thái điểm danh sang "Có phép (-phí)"
    await page.getByRole("button", { name: "+1 Điểm" }).first().click();
    await page.getByRole("button", { name: "Có phép (-phí)" }).first().click();

    // 5. Mở tab Kỳ học phí để xác nhận hóa đơn Kỳ 1 đã được lập tự động
    await classDetail.switchToTuitionTab();
    await expect(page.getByText("Kỳ thu phí #1")).toBeVisible();
    await expect(page.getByText(studentName)).toBeVisible();
  });
});
