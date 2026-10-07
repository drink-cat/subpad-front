import { isAddress, zeroAddress, type Address } from "viem";
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
  chainId?: number;
};

/** 与 LaunchCore 测试一致。Token 合约固定 18 位，tokenDecimals 只是预留字段。 */
export const tokenDecimals = 18n;
export const launchSupply = 1_000_000n * 10n ** 18n;
export const initPrice = 10n ** 18n;

export const createTokenAbi = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "useMockSwap", type: "bool" },
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "tokenDecimals", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "quoteToken", type: "address" },
          { name: "initPrice", type: "uint256" },
          { name: "subpadId", type: "uint256" },
          { name: "subpadFeeTo", type: "address" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export function createTokenParams(input: {
  useMockSwap: boolean;
  tokenName: string;
  tokenSymbol: string;
  quoteToken: string;
  subpadId?: number;
  subpadFeeTo?: string;
}) {
  const quoteToken = input.quoteToken.trim();
  if (!isAddress(quoteToken)) throw new Error("报价币地址无效");
  const subpadId = input.subpadId ?? 0;
  const feeTo = subpadId === 0 ? zeroAddress : (input.subpadFeeTo ?? "").trim();
  if (!isAddress(feeTo)) throw new Error("子 pad 费用地址无效");
  return {
    useMockSwap: input.useMockSwap,
    tokenName: input.tokenName,
    tokenSymbol: input.tokenSymbol,
    tokenDecimals,
    totalSupply: launchSupply,
    quoteToken,
    initPrice,
    subpadId: BigInt(subpadId),
    subpadFeeTo: feeTo as Address,
  };
}

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
