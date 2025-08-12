import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Text Composer",
  description: "A desktop-only image editing tool for adding customizable text overlays to PNG images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
