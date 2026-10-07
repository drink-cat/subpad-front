import { request } from "@/lib/api";
import { getPublicConfig, type PublicConfig } from "@/lib/config";
import { getChainEnv } from "@/lib/env";

export type TokenInput = {
  subpadId?: number;
  tokenName: string;
  tokenSymbol: string;
};

export function selectedQuoteToken(config: PublicConfig) {
  const local = getChainEnv() === "local";
  const name = local ? "localUsdc" : "sepoliaUsdc";
  const addr = (local ? config.quoteToken.localUsdc : config.quoteToken.sepoliaUsdc).trim();
  if (!addr) throw new Error(local ? "未配置 localUsdc" : "未配置 sepoliaUsdc");
  return { name, addr };
}

export async function createToken(input: TokenInput) {
  const config = await getPublicConfig();
  return request("/api/token_info/create", {
    method: "POST",
    body: JSON.stringify({ ...input, quoteTokenAddr: selectedQuoteToken(config).addr }),
  });
}
