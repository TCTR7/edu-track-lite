# AGENTS.md – Hướng dẫn dành cho AI Agents & Lập trình viên (EduTrack Lite)

Tài liệu này cung cấp ngữ cảnh kiến trúc, quy ước mã nguồn, quy tắc bảo mật dữ liệu, phong cách giao diện và quy trình kiểm thử cho mọi AI Agent làm việc trên kho mã **EduTrack Lite**.

---

## 1. Tổng quan Dự án & Tài liệu Đặc tả
* **Tên dự án:** **EduTrack Lite** — Hệ thống Progressive Web App (PWA) quản lý lớp dạy thêm, điểm danh 1 chạm, theo dõi học tập và đối soát học phí tinh gọn tại Việt Nam.
* **Tài liệu đặc tả nghiệp vụ & UI (Single Source of Truth):** [`docs/EduTrack_Specs.md`](./docs/EduTrack_Specs.md) (Phiên bản 1.2).
  * Trước khi thay đổi logic nghiệp vụ, schema cơ sở dữ liệu hoặc hệ thống màu sắc, **bắt buộc** đọc phần liên quan trong [`docs/EduTrack_Specs.md`](./docs/EduTrack_Specs.md); chỉ đọc thêm khi cần làm rõ phụ thuộc.

---

## 2. Công nghệ & Kiến trúc Hệ thống (Tech Stack)
* **Framework:** Next.js 15 (App Router, Server Components + Server Actions) + TypeScript (`strict: true`).
* **Styling & UI:** Tailwind CSS v4 + Phông chữ tự host `@fontsource-variable/nunito` + Phong cách **"Soft Clay Pastel"** (định nghĩa tại [`src/app/globals.css`](./src/app/globals.css)).
* **Database & ORM:** PostgreSQL 17 (chạy qua Docker tại cổng `localhost:5435`) + Drizzle ORM ([`src/db/schema.ts`](./src/db/schema.ts) — 12 bảng chuẩn hóa).
* **Authentication & Authorization:** JWT lưu trong `HttpOnly Cookie` (`edutrack_session`), ký và xác thực bằng `jose` (tương thích Edge Middleware) kết hợp băm mật khẩu `bcryptjs` ([`src/lib/auth.ts`](./src/lib/auth.ts), [`src/middleware.ts`](./src/middleware.ts)).
* **Lưu trữ Tệp & Ảnh (Dual Storage Adapter):** Hỗ trợ chuyển đổi qua biến môi trường `STORAGE_DRIVER=local | r2` ([`src/lib/storage.ts`](./src/lib/storage.ts)) kết hợp nén ảnh phía trình duyệt xuống `~300KB` WebP ([`src/lib/client/upload-helper.ts`](./src/lib/client/upload-helper.ts)).
* **Kiểm thử Tự động:**
  * **Unit Tests:** Vitest (`src/lib/__tests__/*.test.ts`).
  * **E2E Automation Tests:** Playwright theo mô hình Page Object Model tại [`automation_test/`](./automation_test/).

---

## 3. Quy tắc Nghiệp vụ & Bảo mật Bất di bất dịch (Mandatory Guardrails)

1. **Cô lập dữ liệu đa trung tâm (Multi-tenant Isolation):**
   * Mọi truy vấn đọc/ghi của `ADMIN`, `TEACHER`, `STUDENT` bắt buộc phải lọc theo `center_id` của người dùng đang đăng nhập hoặc qua quan hệ đã được kiểm tra quyền. `requireClassAccess(classId)` tại [`src/lib/services/class-access.ts`](./src/lib/services/class-access.ts) chỉ dành cho `ADMIN`/`TEACHER`; `STUDENT` phải bị giới hạn theo cả trung tâm và hồ sơ học sinh của phiên đăng nhập.
   * `TEACHER` chỉ được xem và thao tác trên các Ca học có `classes.teacher_id === user.id`.
2. **Kiểm tra trạng thái Khóa tức thì:**
   * Hàm `getCurrentUser()` / `requireAuth()` tại [`src/lib/auth.ts`](./src/lib/auth.ts) luôn kiểm tra `users.is_active === true` và `centers.is_active === true`. Không được bỏ qua bước kiểm tra này.
3. **Bảo mật tuyệt đối `internal_note`:**
   * Trong bảng `class_students`, cột `public_note` dành cho Phụ huynh xem, còn `internal_note` chỉ dành cho `ADMIN` và `TEACHER`.
   * Mọi truy vấn phục vụ `ROLE_STUDENT` (tại `/portal` hoặc bất kỳ API nào của học sinh) **tuyệt đối không được `SELECT class_students.internal_note`**.
4. **Tách rời Chu kỳ Điểm danh và Công nợ Học phí:**
   * Khi buổi điểm danh chạm mốc `sessions_per_cycle` (VD: `16/16`), hàm `syncTuitionCycleBillsTx` ([`src/lib/services/tuition-cycle.ts`](./src/lib/services/tuition-cycle.ts)) phải chạy trong cùng **1 DB Transaction** để lập hóa đơn kỳ cũ (`OPEN`) và đồng thời tăng `current_cycle_number` + đặt `current_session_count = 0` ngay lập tức. Không bao giờ chặn buổi điểm danh kỳ mới vì còn học sinh nợ kỳ cũ.
5. **Lưu vết Nhật ký hoạt động (`audit_logs`):**
   * Mọi thao tác nhạy cảm (thu học phí, hoàn tác/hủy thu, điều chỉnh học phí, mở/sửa điểm danh, cộng điểm, nhập/xóa điểm kiểm tra, đổi trạng thái học sinh, cấp lại mật khẩu) đều phải gọi `recordAuditLog(...)` ([`src/lib/services/audit.ts`](./src/lib/services/audit.ts)).

---

## 4. Quy tắc Giao diện "Soft Clay Pastel" & UX

* **Bảng màu & Class chuẩn:** Sử dụng các token và utility class đã định nghĩa trong [`src/app/globals.css`](./src/app/globals.css):
  * Thẻ nội dung chính: `.clay-card` (nền trắng kem, bo góc `24px`, bóng nổi đa lớp).
  * Thẻ thống kê: component `<StatCard tone="lavender | pink | butter | sky | mint | peach" />` ([`src/components/ui/stat-card.tsx`](./src/components/ui/stat-card.tsx)).
  * Hộp thoại: sử dụng `<ModalDialog />` ([`src/components/ui/modal-dialog.tsx`](./src/components/ui/modal-dialog.tsx)) dựa trên phần tử `<dialog>` chuẩn HTML5 hỗ trợ đóng bằng phím `ESC` và click ra vùng nền ngoài.
* **Thiết kế Mobile-First cho Giáo viên đứng lớp:**
  * Mọi nút bấm thao tác nhanh (Điểm danh, `+1 Điểm`, Thu Tiền mặt / Chuyển khoản) phải có chiều cao vùng chạm tối thiểu `44px` (`min-h-11` hoặc `min-h-[44px]`).
  * Không sử dụng hiệu ứng chỉ hoạt động khi di chuột (`hover-only`) cho các chức năng cốt lõi.

---

## 5. Quy ước Viết & Chạy Kiểm thử (Testing Conventions)

* **Khi thêm hoặc sửa logic tính toán:** Bổ sung Unit Test tương ứng trong `src/lib/__tests__/` và chạy test liên quan trước; chạy toàn bộ unit suite khi hoàn tất thay đổi tính toán.
* **Khi thêm hoặc sửa luồng giao diện (UI / Server Actions):**
  * Đặt Page Object trong `automation_test/features/<module>/page/<name>.page.ts`.
  * Đặt kịch bản kiểm thử trong `automation_test/features/<module>/test/<name>.spec.ts`.
  * Tránh dùng `page.getByRole("alert")` trần không phạm vi vì dễ đụng với thẻ `#__next-route-announcer__` của Next.js; hãy ưu tiên `page.locator('form [role="alert"]')` hoặc gắn `data-testid` rõ ràng trên các thẻ danh sách.

## 6. Điều hướng CodeGraph & quản lý ngữ cảnh

- Khi có `.codegraph/`, ưu tiên MCP `codegraph_explore` trước khi tìm/đọc mã đã index. Truy vấn tên symbol hoặc đường dẫn cụ thể, đặt `maxFiles` nhỏ (thường 1–3), chỉ mở rộng khi thiếu bằng chứng. Nguồn đã trả được coi là đã đọc; không đọc lại bằng grep/Read.
- Nếu MCP không khả dụng, dùng CLI `codegraph explore "<symbol hoặc câu hỏi cụ thể>"`; `query`, `callers`, `callees`, `impact` chỉ dùng khi cần thông tin riêng đó và CLI hiện tại hỗ trợ. Không bắt buộc một chuỗi lệnh cho mọi task.
- Nếu không có index hoặc công cụ lỗi: dùng `rg` theo thư mục/từ khóa cụ thể và đọc đoạn cần thiết. Không tự chạy `codegraph init`. Tài liệu, cấu hình và nội dung chưa index được đọc trực tiếp.
- Khi graph cảnh báo nguồn cũ hoặc không trả được nguồn: đọc đúng file bị ảnh hưởng; kết quả không tìm thấy không chứng minh không có phụ thuộc/test. CodeGraph hỗ trợ phân tích, không thay compiler hoặc test runner.
- Giữ log gọn, tránh dump cả repo/HTML report. Đọc error context, trace hoặc ảnh của đúng test lỗi khi cần; kiểm tra UI bằng assertions và ảnh vùng liên quan nếu bố cục cần xác minh. Không tự tắt assertion screenshot trong test.
- Sau hai lần sửa cùng lỗi không thành công, dừng cách sửa thử hiện tại để thu thập thêm bằng chứng và đổi giả thuyết. Chỉ hỏi người dùng khi thiếu quyết định/quyền truy cập cần thiết.

## 7. Kiểm chứng & bàn giao

- Lệnh cài đặt, tài khoản seed và cách chạy test: [README.md](./README.md). Quy trình chi tiết: [AI_ORCHESTRATION_PLAYBOOK.md](./AI_ORCHESTRATION_PLAYBOOK.md), chỉ đọc khi thiết lập hoặc thay đổi quy trình.
- Debug bằng test/file/module liên quan. Chọn test từ graph **và** nghiệp vụ/route; không dùng kết quả `affected` làm danh sách duy nhất. Có thể chạy typecheck sớm.
- Thay đổi phân quyền phải kiểm tra khác trung tâm, lớp không được phân công, tài khoản/trung tâm bị khóa và dữ liệu trả về cho học sinh. Thay đổi học phí/điểm danh phải kiểm tra mốc chu kỳ, công nợ cũ, giao dịch đồng thời và audit tương ứng.
- Với UI/Server Actions, kiểm tra hành vi thành công, lỗi và quyền truy cập; chạy Desktop/Mobile khi luồng hoặc bố cục bị ảnh hưởng. Giữ Page Object và selector theo Mục 5; dùng các `data-testid` đã thống nhất trong plan nếu có.
- Mutation cần loading/error và rollback khi dùng optimistic UI; nút chống bấm đúp chỉ là UX. Các thao tác nhạy cảm cần cơ chế backend/DB phù hợp (transaction, ràng buộc duy nhất, khóa hoặc idempotency) để chống ghi trùng/xung đột.
- Không làm yếu test để pass; giữ các thay đổi không liên quan trong workspace. Chỉ dùng dữ liệu giả cho test/demo; không commit bí mật hoặc dữ liệu thật. Không reset/seed vào DB chưa xác định là môi trường test.
- Task phức tạp hoặc thay đổi contract/schema: ghi phạm vi, tiêu chí chấp nhận, test và ràng buộc dữ liệu trong `docs/plans/` trước khi sửa. Task nhỏ không bắt buộc plan riêng. Không tự mở rộng contract ngoài phạm vi được giao.
- Trước bàn giao: chạy các kiểm tra phù hợp mức rủi ro, mở rộng khi có căn cứ; báo rõ thay đổi, lệnh đã chạy/kết quả, phần chưa kiểm chứng và lý do. Không tuyên bố pass dựa vào đọc cấu hình hoặc liệt kê test.
- Giao tiếp bằng tiếng Việt ngắn gọn; định danh code bằng tiếng Anh, giữ UTF-8.
