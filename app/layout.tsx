import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsUP? — The Chat Guilt Ledger & Unread Command Center",
  description:
    "Other apps summarize your chats. We tell you who you've been letting down. Local-first AI triage for WhatsApp, Telegram, and Discord.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#07080C] text-[#E6E8F0] antialiased selection:bg-[#FF334B]/30 selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}
