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
  description: "An AI-native India marketplace with Guided Search and clear product information.",
  applicationName: "Veyra",
  metadataBase: new URL("https://veyra.local"),
  openGraph: {
    title: "Veyra",
    description: "An AI-native India marketplace with Guided Search and clear product information.",
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
