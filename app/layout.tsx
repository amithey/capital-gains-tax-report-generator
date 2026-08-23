import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מחולל דוח מס לרווחי הון",
  description: "חישוב רווחי/הפסדי הון בשקלים מדוח פעילות של מתווך זר (IBKR)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
