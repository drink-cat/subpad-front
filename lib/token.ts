import { request } from "@/lib/api";
import { getPublicConfig, type PublicConfig } from "@/lib/config";
import { getChainEnv } from "@/lib/env";

export type Token = {
  id: number;
  userId: number;
  subpadId: number | null;
  poolId: string;
  creator: string;
  chainId: number;
  tokenAddr: string;
  tokenName: string;
  tokenSymbol: string;
  quoteTokenAddr: string;
  quoteTokenSymbol: string;
  launchSupply: number;
  tickSpacing: number;
};

export type TokenQuery = {
  userId?: number;
  subpadId?: number;
  poolId?: string;
  creator?: string;
  chainId?: number;
  tokenAddr?: string;
  tokenSymbol?: string;
};

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

export function getToken(id: number) {
  return request<Token>(`/api/token_info/get?id=${id}`);
}

export function listTokens(query: TokenQuery) {
  const params = new URLSearchParams();
  if (query.userId !== undefined) params.set("userId", String(query.userId));
  if (query.subpadId !== undefined) params.set("subpadId", String(query.subpadId));
  if (query.poolId) params.set("poolId", query.poolId);
  if (query.creator) params.set("creator", query.creator);
  if (query.chainId !== undefined) params.set("chainId", String(query.chainId));
  if (query.tokenAddr) params.set("tokenAddr", query.tokenAddr);
  if (query.tokenSymbol) params.set("tokenSymbol", query.tokenSymbol);
  params.set("limit", "200");
  return request<Token[] | null>(`/api/token_info/list?${params.toString()}`).then((rows) => rows ?? []);
}

export async function createToken(input: TokenInput) {
  const config = await getPublicConfig();
  return request("/api/token_info/create", {
    method: "POST",
    body: JSON.stringify({ ...input, quoteTokenAddr: selectedQuoteToken(config).addr }),
  });
}
