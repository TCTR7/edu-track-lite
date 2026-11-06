import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTrack Lite – Quản lý Lớp Dạy Thêm Tinh Gọn",
  description:
    "Hệ thống quản lý ca học, điểm danh 1 chạm, tự động tính học phí và cổng theo dõi cho phụ huynh.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EduTrack Lite",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8e7ddf",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-canvas text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
