# Kế hoạch đồng bộ UI Soft Clay Pastel

Trạng thái: đã hoàn thành đợt 1 và đợt 2. Đã xem ảnh render và kiểm thử production trên Chromium Desktop/Mobile; các giới hạn kiểm chứng được ghi ở Mục 8.

## 1. Mục tiêu và căn cứ

- Tham chiếu: [ui-style-reference.jpg](../assets/ui-style-reference.jpg). Áp dụng chất liệu mềm, khối phồng, ánh sáng cùng hướng, lavender/kem và minh họa thân thiện vào ứng dụng giáo dục.
- Theo [EduTrack_Specs.md](../EduTrack_Specs.md), Phần 6. Giữ cấu trúc menu, luồng Ca học → Điểm danh và ý nghĩa màu trạng thái.
- Source đã kiểm tra: globals.css, HeroBanner, StatCard, ClassesClient, CenterShell, OperatorShell, ModalDialog. Hero hiện dùng emoji; StatCard có màu chip hardcode; thẻ ca học dùng bg-white/shadow-xs; các shell còn bóng/màu inline. CSS đã có nhiều lớp bóng, cần chuẩn hóa và áp dụng nhất quán.
- Ảnh là tham chiếu nghệ thuật; không sao chép chữ, nội dung âm nhạc, avatar, watermark hoặc chức năng dashboard không có trong sản phẩm.

## 2. Quyết định thiết kế đề xuất

- Chất liệu: kem sáng, cạnh trên bắt sáng, bóng tiếp xúc nhẹ và bóng đổ tím mềm; dùng một hướng sáng từ trên trái.
- Phân cấp chiều sâu: banner/khung điều hướng nổi bật nhất; card và stat nổi vừa; bảng/danh sách dày dữ liệu dùng bề mặt nhẹ để dễ đọc. Không tăng bóng đồng loạt cho mọi phần tử.
- Hero dùng minh họa clay chủ đề học tập: nhân vật thân thiện bên sách/bút, kèm một vài vật trang trí. Tạo asset riêng, nền trong suốt; giữ chữ và CTA bằng HTML để responsive và accessible.
- Icon thống kê dùng khối đế clay có độ dày, viền sáng và biểu tượng rõ nghĩa. Giữ Lucide cho icon thao tác/điều hướng nhỏ; không thay toàn bộ icon bằng ảnh.
- Desktop: hero có vùng minh họa riêng; Mobile: giảm kích thước/ẩn đồ trang trí phụ, ưu tiên tiêu đề và thao tác chính. Không đẩy danh sách ca học xuống quá sâu.
- Token nền và pastel giữ theo đặc tả. Nếu màu chữ/nút hiện tại không đủ tương phản, chọn token đậm phù hợp hoặc bổ sung token ngữ nghĩa và cập nhật đặc tả cùng thay đổi.

## 3. Phạm vi và giới hạn

- Đợt 1: tokens/bề mặt dùng chung, HeroBanner, StatCard, trang Ca học, CenterShell; kiểm tra các trang đang dùng chung component.
- Đợt 2: chi tiết Ca học/Điểm danh, Học phí, đăng nhập, Portal, Operator, Học sinh, Tài liệu, Quản trị và Tài khoản.
- Chỉ thay đổi trình bày, responsive và khả năng tương tác cần thiết cho UI. Không đổi schema, API/Server Action contract, công thức tiền, phân quyền, truy vấn hoặc dữ liệu nghiệp vụ.
- Giữ nguyên kiểm tra center_id, quyền giáo viên, không lộ internal_note, transaction học phí và audit. Không thêm biểu đồ, số liệu hoặc thông báo giả để giống ảnh.

## 4. Các bước triển khai

### Bước 1 — Chụp hiện trạng và khóa phạm vi

- Mở bản chạy với dữ liệu giả đã chuẩn bị, chụp Ca học trên Desktop/Mobile và các màn hình đại diện của 4 role.
- Ghi viewport, dữ liệu, trạng thái và tên trình duyệt để ảnh trước/sau so sánh được. Kiểm tra đăng nhập và các class ghi đè bóng trong bản render; không coi nhận xét từ conversation cũ là bằng chứng hiện tại.
- Dùng CodeGraph theo component để khoanh vùng; CSS/config chưa index đọc trực tiếp. Chỉ tìm class còn lệch trong phạm vi màn hình đang sửa.
- Đầu ra: baseline và danh sách component/callers chịu ảnh hưởng; không cần quét toàn repo nhiều lần.

### Bước 2 — Chuẩn hóa vật liệu và component

- globals.css: token ngữ nghĩa cho surface, highlight, shadow card/banner/button/icon, trạng thái và focus; class dùng chung cho nút chính/phụ/nguy hiểm, input và progress.
- Tránh thay shadow-xs/sm toàn cục để tạo hiệu ứng clay mạnh: các utility này đang ảnh hưởng nhiều màn hình. Ưu tiên class/variant rõ ràng, bỏ override ở nơi đã chuyển đổi.
- StatCard: chuyển mã màu chip/hint vào token, tăng chiều sâu của đế icon, giữ API tone/icon/label/value/hint hiện có.
- ModalDialog: variant bóng dành riêng cho modal, giữ native dialog, ESC/click nền, focus; vùng bấm đóng ít nhất 44×44px.
- Bảo đảm disabled/loading/error/focus/pressed rõ ràng; reduced-motion áp dụng cho mọi chuyển động mới.

### Bước 3 — Asset và trang Ca học mẫu

- Tạo một minh họa clay giáo dục thống nhất với ảnh bằng công cụ tạo ảnh theo skill imagegen khi triển khai; lưu bản nguồn và bản web đã tối ưu. Đầu ra trong public/illustrations/; không lấy nhân vật/crop watermark từ ảnh tham chiếu.
- Mục tiêu ban đầu cho asset hero web: khoảng 250KB hoặc thấp hơn nếu chất lượng cho phép; kiểm tra dung lượng thực. Không tạo runtime 3D/WebGL cho minh họa tĩnh.
- HeroBanner thêm prop minh họa tùy chọn, giữ tương thích với callers đang dùng emoji. Đặt kích thước/aspect ratio, alt rỗng khi thuần trang trí, không để hình che CTA.
- ClassesClient: thẻ ca học dùng surface clay, progress có độ phồng, badge và nút đồng bộ; giữ đủ lịch, giáo viên, sĩ số, chu kỳ và nợ phí.
- CenterShell: đồng bộ sidebar, active pill, avatar và bottom bar; giữ số tab/menu và điều kiện hiển thị theo role.
- Đầu ra: Ca học Desktop/Mobile chạy thật với minh họa hoàn chỉnh, ảnh trước/sau và kiểm tra luồng mở ca/điểm danh. Đây là mốc xem lại chất lượng thị giác trước khi mở rộng.

### Bước 4 — Áp dụng theo nhóm màn hình

- Ưu tiên chi tiết Ca học/Điểm danh và Học phí: giữ mật độ thông tin, trạng thái chọn, thao tác một chạm và khả năng đọc số tiền.
- Tiếp theo đăng nhập, Portal và Operator; kiểm tra màu và chiều sâu khi dùng StatCard/ModalDialog mới. Không trang trí dày màn hình thu phí hoặc danh sách dữ liệu.
- Cuối cùng Học sinh, Tài liệu, Quản trị và Tài khoản; thay các lớp màu/bóng riêng bằng token/component phù hợp.
- Mỗi nhóm hoàn thành có ảnh và kiểm thử liên quan; chưa đạt trang mẫu thì điều chỉnh trước khi lan rộng.

### Bước 5 — Kiểm chứng và hồi quy

- Typecheck trong lúc sửa; build khi chốt đợt. Không thêm unit test chỉ để kiểm tra class CSS.
- POM/spec đặt đúng automation_test/features/<module>/{page,test}. Bổ sung assertions cho tràn ngang, CTA có thể thao tác, kích thước vùng chạm, focus, mở/đóng modal; ưu tiên role/label có phạm vi, data-testid chỉ cho thành phần không định vị ổn định được.
- Chạy các spec liên quan trước: classes, auth, tuition; mở rộng operator, student-portal, documents, management khi áp dụng các màn hình đó. Một số test hiện ghi dữ liệu nên phải xác định DB test trước khi chạy.
- Desktop 1280×800; Mobile 390×844; bổ sung kiểm tra 360px và breakpoint 768px cho layout. Dùng cấu hình Pixel 7 cho E2E mobile hiện có; ghi viewport thực khi chụp ảnh.
- Các trạng thái: rỗng, tên dài, nhiều ca, có/không có ca trong giờ, có nợ/không nợ, modal dài, pending/error, teacher/admin. Xác minh bằng dữ liệu giả, không thay logic để tạo trạng thái.
- Chụp ảnh vùng và toàn trang khi cần phát hiện lệch bố cục. Duyệt ảnh cạnh nhau với reference theo chất liệu/phân cấp, không so pixel trực tiếp với dashboard âm nhạc.
- Nếu thêm snapshot tự động, chỉ chốt baseline sau khi bản render đã được xem; cố định dữ liệu, font, thời gian và animation để giảm nhiễu. Không tự cập nhật snapshot chỉ để pass.

Lệnh mẫu (thay file/tên test theo phạm vi):

```powershell
npm run typecheck
npm run test:ai:e2e -- automation_test/features/classes/test/class-operations.spec.ts --project=chromium-headed
npm run test:ai:e2e:mobile -- automation_test/features/classes/test/class-operations.spec.ts
npm run build
npm run test:e2e:verify -- automation_test/features/classes/test/class-operations.spec.ts --project=chromium-headed
```

- Nghiệm thu dùng server mới; không chạy hai project ghi chung dữ liệu song song. Kiểm thử trình duyệt không có điều kiện chạy phải báo rõ, không thay bằng --list rồi tuyên bố pass.

### Bước 6 — Bàn giao

- Cập nhật Phần 6 của đặc tả nếu bổ sung token/variant; không tạo bộ quy tắc UI trùng với AGENTS.
- Bàn giao danh sách màn hình, ảnh trước/sau cùng viewport, kết quả test/build, kích thước asset và các giới hạn còn lại.
- Chia thay đổi theo nền tảng UI → Ca học mẫu → các nhóm màn hình, để review/hoàn tác từng phần dễ dàng.

## 5. Tiêu chí hoàn thành

- Ca học có minh họa giáo dục clay, card/icon/button có độ phồng và ánh sáng đồng nhất; các màn hình trong phạm vi dùng cùng hệ vật liệu.
- Không còn màu/bóng hardcode mới ở component khi đã có token tương ứng; không có utility vô tình ghi đè bề mặt chuẩn.
- Không tràn ngang ở 360px; hero không che nội dung/CTA; bottom bar không che phần cuối trang hoặc nút thao tác; modal cuộn được khi bàn phím mở.
- Vùng chạm thao tác ít nhất 44×44px, input chữ tối thiểu 16px, focus bàn phím nhìn rõ, chuyển động tôn trọng reduced-motion.
- Chữ trên pastel/tím đạt tương phản 4.5:1 theo đặc tả; trạng thái có chữ/icon, không chỉ phân biệt bằng màu.
- Asset không làm layout nhảy do thiếu kích thước; tải lỗi vẫn đọc được lời chào và dùng CTA. Đo ảnh tải và phản hồi thao tác trên cùng điều kiện baseline.
- Các luồng hiện có và quyền 4 role tiếp tục hoạt động; kiểm thử phù hợp pass và có ảnh render thực tế. Tiêu chí thị giác cần xem ảnh, không chỉ kiểm tra source/class.

## 6. Điểm cần quyết định ở mốc xem mẫu

- Độ nổi khối và mức trang trí có đủ gần reference nhưng vẫn đọc nhanh khi đứng lớp hay không.
- Nhân vật/minh họa giáo dục có phù hợp nhận diện EduTrack và độ tuổi người dùng hay không.
- Đề xuất bắt đầu Bước 1–3, xem trang Ca học hoàn chỉnh rồi mới chốt áp dụng toàn hệ thống.

## 7. Kết quả đợt 1

- Đã chụp baseline trang Ca học 1280×800 và 390×844 với tài khoản admin seed; không reset/seed hoặc ghi thay đổi nghiệp vụ.
- Đã chuẩn hóa vật liệu trong globals.css; cập nhật HeroBanner, StatCard, ModalDialog, ClassesClient và CenterShell. Các trang dùng chung component thừa hưởng bề mặt mới; chưa chỉnh riêng toàn bộ phân hệ.
- Minh họa tạo bằng image_gen tích hợp: WebP 720×480 có alpha, 38.068 bytes. Bản nguồn và prompt ở docs/assets/illustrations/.
- Xác minh: typecheck pass; 21 unit tests pass; production build pass. Trên server production mới cổng 3100: 4 test Desktop (2 auth + 2 clay-layout) pass, 2 test clay-layout Mobile pass.
- E2E dùng config tạm trong automation_test/artifacts/ui-clay/production.config.ts để trỏ vào server production 3100 đã khởi động từ build vừa tạo; không tái sử dụng dev server.
- Test mới kiểm tra các chiều rộng 360/390/768/1280, modal với chiều cao 500px, vùng chạm 44×44, focus khi ESC, click backdrop, điều hướng bằng bàn phím, reduced-motion, quyền UI giáo viên và khả năng điều hướng khi ảnh tải lỗi. Không ghi DB.
- Smoke read-only trên Mobile: tuition, students, documents, management, account đều render và không tràn ngang; không có pageerror JavaScript trong các lượt xem này. Đây không phải nghiệm thu nghiệp vụ thu tiền/upload/chốt kỳ.
- Các cặp màu mới kiểm tra trực tiếp từ token; chữ eyebrow của banner đã tăng từ brand-800 sang brand-900 để đạt tương phản trên đầu gradient tối nhất.
- Ảnh trước/sau và modal: automation_test/artifacts/ui-clay/. Đã xem ảnh render cuối Desktop/Mobile/modal; các ảnh là dữ liệu seed đang có trong DB local.
- Chưa kiểm tra thiết bị iOS/Safari thật, bàn phím mềm thật hoặc toàn bộ trạng thái dữ liệu (rỗng/live/error/concurrent). Chưa áp dụng đợt 2; cần xem trang mẫu theo mốc Bước 3 trước khi mở rộng.

## 8. Kết quả đợt 2 — 2026-11-06

- Hoàn thành: 4 tab chi tiết Ca học, Điểm danh, Học phí/Đối soát, đăng nhập, Portal, Operator, danh bạ Học sinh, Tài liệu, hub Quản trị, Giáo viên, Cài đặt, Nhật ký và Tài khoản hai phân hệ. Tập trung thay class/style dùng chung; không sửa schema, truy vấn hoặc Server Actions.
- Thêm clay-panel, clay-input, clay-tab-track/active, clay-filter và các variant hành động/trạng thái. Dùng lại ảnh WebP 38.068 bytes của đợt 1 cho đăng nhập; không sinh thêm ảnh.
- Cập nhật aria-pressed cho chip khối tài liệu; các nút Điểm danh đo thực tế cao 44px, rộng khoảng 105px ở viewport 390px. Nhãn Portal xuống dòng, badge số lượng không bị áp dụng style nút.
- Đã chụp baseline 11 màn hình và ảnh cuối các màn hình đại diện. Artifact: automation_test/artifacts/ui-clay-phase2/. Xem ảnh login_desktop_final.png, portal_mobile_final.png, operator_desktop_final.png, tuition_desktop_final.png và documents_mobile_final.png.
- Build production và kiểm tra TypeScript pass. 21 unit test pass. Bộ E2E đầy đủ: 13/13 Desktop và 13/13 Mobile pass, chạy tuần tự trên server production mới cổng 3100, config tạm production.config.ts trong thư mục artifact.
- Sau chỉnh cuối vùng chạm filter và aria-pressed: build lại pass; chạy lại 4 test liên quan (UI toàn hệ thống + upload/lọc/xóa tài liệu) trên mỗi project, 4/4 Desktop và 4/4 Mobile đều pass. Các log cuối được lưu thành final-desktop.log/final-mobile.log.
- 3 test UI mới có POM tại automation_test/features/ui/: kiểm tra các màn hình ở 360/390/768/1280px, bộ lọc khối tài liệu, lọc hóa đơn ra trạng thái rỗng rồi khôi phục, tab Đối soát, modal Điều chỉnh/Tạo trung tâm/Đổi mật khẩu, chuyển môn và các tab Portal.
- E2E hiện có đã chạy thực tế: 4 role đăng nhập, tạo ca/học sinh, ghi chú/điểm, điểm danh chốt kỳ, cộng điểm, thu/điều chỉnh/hoàn tác/chuyển khoản và audit, upload/xóa tài liệu, khóa/mở trung tâm test, kiểm tra internal_note không có trong HTML Portal.
- DB và storage đã được xác nhận là local trước khi chạy bộ test có ghi. E2E tạo thêm dữ liệu tổng hợp và cập nhật dữ liệu seed theo kịch bản; không reset hoặc xóa DB. Ảnh baseline và ảnh cuối vì vậy có thể khác số lượng do dữ liệu test tăng.
- Các lượt chụp cuối không ghi nhận pageerror JavaScript. Các cặp màu ngữ nghĩa mới có tương phản 4.56:1 đến 6.08:1 theo token thực; chi tiết ở verification.json.
- Giới hạn: Chromium/Pixel 7 giả lập, chưa kiểm tra iOS/Safari và bàn phím mềm thật; chưa đo hiệu năng field/Lighthouse hoặc chốt visual snapshot tự động. Ảnh VietQR từ dịch vụ ngoài không tải được trong môi trường kiểm tra nên chỉ xác minh cấu hình/UI và luồng thu tiền, chưa xác minh hình QR hiển thị hoặc khả năng quét.
- Đã dừng các preview server do agent mở.
