"use client";

import { WalletButton } from "@/components/WalletButton";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="site-tabs" aria-label="页面" />
      <WalletButton />
    </header>
  );
}
