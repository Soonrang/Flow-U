import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowU",
  description: "유기동물 봉사 센터 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* font-sans 클래스를 넣으면 Tailwind에서 설정한 프리텐다드가 적용됩니다. */}
      {/* antialiased는 글꼴을 더 부드럽고 선명하게 렌더링해 줍니다. */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
