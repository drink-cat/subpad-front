import { request } from "@/lib/api";

export type PublicConfig = {
  quoteToken: {
    localUsdc: string;
    sepoliaUsdc: string;
  };
  syncLog: {
    name: string;
    chainId: number;
    rpcUrl: string;
    launchContract: string;
  }[];
};

export function getPublicConfig() {
  return request<PublicConfig>("/api/config", undefined, false);
}
