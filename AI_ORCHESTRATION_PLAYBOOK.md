# AI Orchestration Playbook — EduTrack Lite

Mục tiêu: giảm tổng chi phí ngữ cảnh và số vòng sửa lỗi, đồng thời bảo toàn chất lượng code, kiểm thử và bằng chứng bàn giao. Không đánh đổi phân quyền, tính đúng giao dịch hoặc kiểm chứng UI để giảm token.

## 1. Phạm vi và nguồn quy tắc

- `AGENTS.md` là hướng dẫn thường trực; tài liệu này mô tả quy trình thiết lập và thực thi. Không sao chép toàn bộ playbook vào AGENTS.
- `docs/EduTrack_Specs.md` là nguồn đặc tả nghiệp vụ/UI; đọc phần liên quan trước khi thay đổi nghiệp vụ, schema hoặc màu sắc.
- Lệnh thực thi phải khớp package.json, config và phiên bản công cụ đang cài. Không giả định tool/flag trong template luôn tồn tại.
- Thực hiện trong phạm vi được giao. Multi-agent hoặc phiên review độc lập chỉ dùng khi người dùng yêu cầu hoặc hướng dẫn áp dụng yêu cầu rõ ràng. Task nhỏ dùng một agent; không mặc định tạo hai phiên TDD cho mọi thay đổi.

## 2. Thiết lập hoặc cập nhật quy trình

1. Kiểm tra workspace, giữ thay đổi không liên quan. Đọc AGENTS, package, gitignore và config test trước; chỉ xem code nghiệp vụ nếu cần làm rõ ràng buộc.
2. Hợp nhất AGENTS theo nội dung, không theo số mục. Giữ mọi ràng buộc riêng về tenant, quyền giáo viên, khóa tài khoản/trung tâm, dữ liệu học sinh, transaction học phí và audit. Xóa quy tắc trùng lặp/mâu thuẫn.
3. Loại trừ index/artifact cục bộ bằng gitignore: `.codegraph/`, `test-results/`, `playwright-report/`, `automation_test/artifacts/`. Gitignore không tự bỏ theo dõi file đã commit và không bảo đảm mọi indexer dùng cùng danh sách loại trừ.
4. Kiểm tra có `.codegraph/` và công cụ khả dụng; không tự khởi tạo index. Nếu không dùng được, tiếp tục tìm kiếm có phạm vi.
5. Cung cấp scripts test gọn, typecheck và chế độ E2E phù hợp Windows/CI; không thêm dependency chỉ để đặt biến môi trường. Không tự thêm lệnh reset DB phá hủy dữ liệu. Tạo docs/plans/ cho task cần contract/plan.
6. Xác minh bằng CLI help/list, kiểm tra giá trị config từng chế độ và typecheck. Chạy test/build/E2E theo mức ảnh hưởng; phân biệt kiểm tra cấu hình với test đã chạy thực tế.

## 3. CodeGraph và tiết kiệm ngữ cảnh

- Repo có index: ưu tiên MCP `codegraph_explore` trước khi định vị/đọc code đã index. Dùng symbol/đường dẫn cụ thể, bắt đầu với maxFiles 1–3; chỉ tăng khi thiếu bằng chứng.
- Nguồn đã trả được coi là đã đọc. Không lặp lại bằng Read/grep hoặc thêm callers/impact nếu câu trả lời đã đủ.
- MCP không dùng được: dùng `codegraph explore "<symbol/câu hỏi cụ thể>"`. CLI query/callers/callees/impact chỉ dùng cho nhu cầu tương ứng sau khi xác nhận phiên bản hỗ trợ. Không bắt buộc chuỗi query → callers → node, không đặt hạn mức cứng một lần explore/task.
- Tài liệu/config chưa index được đọc trực tiếp. Index vắng, công cụ lỗi hoặc kết quả thiếu: dùng rg theo thư mục, đọc đoạn cần thiết. Khi cảnh báo stale, xác minh đúng file bị cảnh báo; không dùng vị trí dòng cũ để sửa.
- Graph là bằng chứng cấu trúc, không phải runtime. Không tìm thấy caller/test không có nghĩa không tồn tại, đặc biệt với route, Server Actions và E2E.
- Không dump lockfile, toàn report HTML, artifact hoặc file dài vào hội thoại. Giữ chi tiết lỗi cần thiết; chỉ mở rộng output khi thiếu bằng chứng.

## 4. Chu trình thực hiện và kiểm thử

1. Xác định hành vi cần đổi, ràng buộc và tiêu chí chấp nhận. Task phức tạp ghi plan/contract trong docs/plans/; task nhỏ không cần plan riêng.
2. Lấy nguồn và vùng ảnh hưởng bằng CodeGraph hoặc fallback có phạm vi. Chọn test theo cả phụ thuộc code và luồng nghiệp vụ. Lệnh affected, nếu CLI hỗ trợ, chỉ là gợi ý bổ sung.
3. Sửa tập trung, thêm test hành vi khi logic/luồng thay đổi. Dùng POM và selector ổn định: role/label có phạm vi, data-testid đã thống nhất khi cần. Không làm yếu test để pass.
4. Debug bằng test/file/module liên quan. Có thể typecheck sớm; không chờ E2E pass mới được typecheck.
5. Sau hai lần sửa cùng lỗi vẫn thất bại: ngừng cách thử hiện tại, thu thập thêm bằng chứng, phân loại lỗi môi trường/test/sản phẩm và đổi giả thuyết. Tiếp tục khi có bước điều tra có căn cứ; chỉ hỏi người dùng khi thiếu quyết định/quyền cần thiết.
6. Trước bàn giao, mở rộng theo rủi ro. Logic tính toán: toàn bộ unit suite. UI: luồng liên quan trên Desktop/Mobile và ảnh khi cần. Shared/auth/schema: các luồng tiêu thụ bị ảnh hưởng và build khi phù hợp. Không lặp toàn suite sau mỗi sửa nhỏ.

Các trường hợp cần kiểm tra cho EduTrack:

- Phân quyền: khác trung tâm, giáo viên không được phân công, session thiếu/hết hiệu lực, tài khoản/trung tâm bị khóa, học sinh không nhận internal_note.
- Học phí/điểm danh: biên chu kỳ, vào/nghỉ giữa kỳ, nợ cũ không chặn kỳ mới, rollback transaction, thu/hoàn tác/điều chỉnh và audit; kiểm tra ghi đồng thời khi thay đổi cơ chế ghi.
- Mutation: loading/error và rollback optimistic UI. Chống bấm đúp ở UI không thay transaction, ràng buộc duy nhất, khóa hoặc idempotency backend/DB.
- E2E: dùng DB test và dữ liệu giả; xác định môi trường trước seed/reset. Một worker không thay thế kiểm thử đồng thời khi nghiệp vụ yêu cầu.

## 5. Lệnh và chế độ E2E hiện tại

Xem cú pháp trong [README.md](./README.md).

- `npm run test:ai:unit -- <file-test>`: Vitest chạy một lần, dot reporter, dừng sau lỗi đầu tiên. Fail-fast không chứng minh toàn suite pass.
- `npm run test:ai:e2e -- <file.spec.ts> -g "<tên test>" --project=chromium-headed`: headless, slowMo=0, line reporter, maxFailures=1. Giữ tên Desktop để tương thích dù AI chạy headless.
- `npm run test:ai:e2e:mobile -- <file.spec.ts> -g "<tên test>"`: chỉ chromium-mobile, giả lập Pixel 7; không đại diện cho thiết bị thật/Safari iOS.
- `npm run test:e2e:headless`: headless nhanh, giữ reporter/artifact phục vụ người dùng.
- `npm run test:e2e:verify -- <file.spec.ts>`: AI và server mới; fail nếu cổng 3000 đang có server, không tự tắt tiến trình đó. CI cũng không tái sử dụng server.
- `npm run verify:all`: typecheck + toàn bộ unit suite + production build; **không bao gồm E2E**. E2E nghiệm thu chạy riêng trên DB test đã chuẩn bị.

`scripts/run-e2e.mjs` đặt biến môi trường đa nền tảng, chuyển tiếp các đối số Playwright khác. AI_AGENT=1 bật chế độ gọn; E2E_HEADLESS=1 headless; E2E_MOBILE=1 thêm project mobile; E2E_FRESH_SERVER=1 yêu cầu server mới.

Debug cho phép tái sử dụng server để tránh build lặp nhưng phải biết server phục vụ code nào. Nghiệm thu E2E dùng chế độ verify. Screenshot/trace off không bảo đảm không sinh error-context.md và không tắt assertion ảnh trong test.

## 6. Bằng chứng và đầu ra

- AI mặc định tắt trace/video/screenshot tự động để giảm I/O. Khi cần, E2E_DIAGNOSTICS=1 giữ trace và screenshot khi fail. Không đọc artifact không liên quan.
- Bắt đầu bằng stdout/assertions. Được đọc đoạn error context hoặc mở trace/ảnh vùng liên quan khi giúp tìm nguyên nhân. DOM/CSS assertions không thay kiểm tra trực quan cho mọi lỗi bố cục.
- Bàn giao ngắn gọn: thay đổi, lý do, lệnh đã chạy/kết quả, phần chưa kiểm chứng/lý do. Không tuyên bố E2E pass từ --list hoặc config pass.
- Không commit bí mật/dữ liệu thật; không deploy, gửi thông tin ra ngoài hoặc bật billing ngoài phạm vi được giao.
- Đánh giá tiết kiệm token bằng task đại diện: token vào/ra nếu có telemetry, số lượt gọi, thời gian hoàn tất và số lần sửa lỗi. Không tuyên bố tỷ lệ tiết kiệm khi chưa đo; độ dài tài liệu chỉ là chỉ báo phụ.
