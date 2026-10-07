import { isAddress, isHex, pad, parseUnits, size, type Address } from "viem";
import type { PublicConfig } from "@/lib/config";

export type SwapSide = "buy" | "sell";
export type SwapBasis = "token" | "quote";

export const localUsdcClaim = "1000";

export function isLocalUsdc(quoteTokenAddr: string, localUsdc: string) {
  const quote = quoteTokenAddr.trim().toLowerCase();
  const local = localUsdc.trim().toLowerCase();
  return Boolean(quote) && quote === local;
}

export function launchAddress(config: PublicConfig, chainId: number): Address {
  const found = config.syncLog.find((item) => item.chainId === chainId)?.launchContract.trim() ?? "";
  if (!isAddress(found)) throw new Error("未配置发币合约");
  return found;
}

export function toPoolId(value: string) {
  const raw = value.trim();
  const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw : `0x${raw}`;
  if (!isHex(hex) || size(hex) > 32) throw new Error("poolId 无效");
  return pad(hex, { size: 32 });
}

export function parseSwapAmount(value: string, decimals: number) {
  const text = value.trim();
  if (!/^\d+(\.\d+)?$/.test(text) || /^0+(\.0+)?$/.test(text)) throw new Error("数量请填写大于 0 的数字");
  try {
    return parseUnits(text, decimals);
  } catch {
    throw new Error("数量小数位过多");
  }
}

/** 按代币数量时用输入的整数，不乘 1e18。按报价币数量时按报价币小数位换算。 */
export function parseTradeAmount(value: string, basis: SwapBasis, quoteDecimals: number) {
  if (basis === "quote") return parseSwapAmount(value, quoteDecimals);
  const text = value.trim();
  if (!/^\d+(\.\d+)?$/.test(text) || /^0+(\.0+)?$/.test(text)) throw new Error("数量请填写大于 0 的数字");
  if (text.includes(".")) throw new Error("数量小数位过多");
  return BigInt(text);
}

export function claimUnits(decimals: number) {
  return parseUnits(localUsdcClaim, decimals);
}

/** 买为正，卖为负。按代币数量时报价币填 0，反过来也一样。 */
export function swapAmounts(side: SwapSide, basis: SwapBasis, amount: bigint) {
  const signed = side === "sell" ? -amount : amount;
  if (basis === "token") return { tokenAmount: signed, quoteTokenAmount: BigInt(0) };
  return { tokenAmount: BigInt(0), quoteTokenAmount: signed };
}
