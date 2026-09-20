import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veyra",
  description: "Simulated marketplace discovery"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en-IN"><body>{children}</body></html>;
}
