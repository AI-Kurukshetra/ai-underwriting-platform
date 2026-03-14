import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Underwriting & Risk Intelligence",
  description:
    "AI-powered underwriting platform for real-time scoring, fraud detection, and portfolio monitoring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <div className="shell-gradient" />
          <div className="app-frame">
            <Navigation />
            <main className="app-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
