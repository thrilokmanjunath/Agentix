import type { Metadata } from "next";
import { Inter, Space_Grotesk } from 'next/font/google';
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { auth } from "@/auth";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: "Agentix • Institutional AI Intelligence Platform",
  description: "Secure, customizable AI and Data Science capabilities unified in one enterprise platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" data-theme="alabaster" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans bg-[var(--background)] text-[var(--text-primary)] min-h-screen w-full overflow-x-hidden selection:bg-[var(--accent-soft)] selection:text-[var(--accent-primary)]">
        <ThemeProvider>
          <AuthProvider session={session}>
            <ReactQueryProvider>
              {children}
            </ReactQueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
