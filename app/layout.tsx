import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProposalOS",
  description: "An agnostic presentation generation engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
