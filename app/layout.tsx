import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { parseUserCookie, userCookieName } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subpad",
  description: "Subpad",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={<header className="site-header" />}>
          <SessionFrame>{children}</SessionFrame>
        </Suspense>
      </body>
    </html>
  );
}

async function SessionFrame({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const initialUser = parseUserCookie(jar.get(userCookieName)?.value);

  return (
    <Providers initialUser={initialUser}>
      <SiteHeader />
      {children}
    </Providers>
  );
}
