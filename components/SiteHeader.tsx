"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { WalletButton } from "@/components/WalletButton";

export function SiteHeader() {
  const { user } = useAuth();
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  return (
    <header className="site-header">
      <nav className="site-tabs" aria-label="页面">
        <a className="site-tab" href="/subpad" aria-current={path === "/subpad" ? "page" : undefined}>
          subpad管理
        </a>
        <a className="site-tab" href="/fee" aria-current={path === "/fee" ? "page" : undefined}>
          fee管理
        </a>
      </nav>
      <div className="header-end">
        {user ? (
          <a className="user-name" href="/account" data-testid="header-username">
            {user.username}
          </a>
        ) : (
          <a className="user-name" href="/account" data-testid="header-login">
            登录
          </a>
        )}
        <WalletButton />
      </div>
    </header>
  );
}
