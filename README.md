# EduTrack Lite

Hệ thống Quản lý Lớp Dạy Thêm & Học Sinh Tinh Gọn (đặc tả v1.2) — thiết kế chuẩn Mobile-First (PWA) với thao tác 1–2 chạm trên điện thoại và đầy đủ tính năng đối soát trên máy tính.

## Khởi chạy nhanh trên máy (Local Development)

### 1. Chuẩn bị Database PostgreSQL
**Cách A – Dùng Docker Compose (Tự động trên cổng `5435`, không đụng PostgreSQL cài sẵn trên cổng `5432`):**
```bash
docker compose up -d
```

**Cách B – Dùng PostgreSQL 17 cài sẵn trên máy:**
Tạo database `edutrack_lite` và cập nhật chuỗi `DATABASE_URL` trong file `.env`.

### 2. Đẩy cấu trúc 12 bảng & Tạo dữ liệu mẫu (4 Role)
```bash
npm run db:push
npm run db:seed
```

### 3. Chạy ứng dụng
```bash
npm run dev
```
Truy cập `http://localhost:3000/login` và đăng nhập thử với 4 tài khoản mẫu:
- **Operator:** `operator` / `operator123`
- **Admin (Chủ trung tâm kiêm Giáo viên):** `admin` / `admin123`
- **Giáo viên:** `giaovien1` / `giaovien123`
- **Học sinh / Phụ huynh (học 2 môn):** `nguyenvannam_01` / `nam246`

### 4. Kiểm tra và chạy test

Dùng DB test với dữ liệu giả cho E2E. Seed có ghi dữ liệu; kiểm tra môi trường trước khi chạy. Tài khoản mẫu ở trên chỉ dành cho local/test.

```powershell
npm run typecheck
npm run test
npm run test:ai:unit -- src/lib/__tests__/phase1.test.ts
npm run test:ai:e2e -- --list
npm run test:ai:e2e -- --project=chromium-headed -g "<tên test>"
npm run test:ai:e2e:mobile -- -g "<tên test>"
npm run test:e2e:headless
npm run verify:all
npm run test:e2e:verify -- --project=chromium-headed -g "<tên test>"
```

Thay đường dẫn/tên test bằng test cần chạy. AI dùng headless, slowMo=0, log line, dừng sau lỗi đầu tiên. Desktop giữ tên chromium-headed; Mobile dùng Chromium giả lập Pixel 7. --list chỉ liệt kê, không chạy trình duyệt/test.

verify:all chạy typecheck, toàn bộ unit test và build; E2E chạy riêng. test:e2e:verify yêu cầu cổng 3000 trống, build rồi khởi động server mới. Debug E2E cho phép tái sử dụng server đang chạy, cần bảo đảm đó là code hiện tại. CI luôn yêu cầu server mới.

Khi cần trace và ảnh của test AI bị lỗi (PowerShell):

```powershell
$env:E2E_DIAGNOSTICS = "1"
npm run test:ai:e2e -- --project=chromium-headed -g "<tên test>"
Remove-Item Env:E2E_DIAGNOSTICS
```

Chế độ thường npm run test:e2e chạy headed với slowMo 500ms và HTML report. Quy tắc agent: [AGENTS.md](./AGENTS.md). Quy trình chi tiết: [AI_ORCHESTRATION_PLAYBOOK.md](./AI_ORCHESTRATION_PLAYBOOK.md).
