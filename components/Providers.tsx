"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { AuthProvider } from "@/components/AuthProvider";
import type { SessionUser } from "@/lib/session";
import { createWagmiConfig } from "@/lib/wagmi";

export function Providers({
  initialUser = null,
  children,
}: {
  initialUser?: SessionUser | null;
  children: React.ReactNode;
}) {
  const [config] = useState(() => createWagmiConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
