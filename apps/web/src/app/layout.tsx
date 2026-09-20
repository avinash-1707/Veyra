import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { AppShell } from "@/components/marketplace";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans"
});

export const metadata: Metadata = {
  title: {
    default: "Veyra",
    template: "%s · Veyra"
  },
  description: "A warm, simulated India marketplace with optional evidence grounded AI guidance.",
  applicationName: "Veyra",
  metadataBase: new URL("https://veyra.local"),
  openGraph: {
    title: "Veyra",
    description: "A warm, simulated India marketplace with optional evidence grounded AI guidance.",
    locale: "en_IN",
    siteName: "Veyra",
    type: "website"
  }
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={geist.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
