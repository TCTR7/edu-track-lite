import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduTrack Lite – Quản lý Lớp Dạy Thêm Tinh Gọn",
    short_name: "EduTrack Lite",
    description:
      "Ứng dụng quản lý ca học, điểm danh 1 chạm, tính học phí tự động và cổng theo dõi dành cho phụ huynh.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2ee",
    theme_color: "#8e7ddf",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
