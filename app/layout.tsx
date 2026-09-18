import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Persona Studio",
  description: "Create persistent synthetic AI personas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
