import { request } from "@/lib/api";

export type Fee = {
  id: number;
  chainId: number;
  poolId: string;
  txHash: string;
  feeType: string;
  feeToken: string;
  feeDecimal: number;
  feeAmount: number;
  feeTo: string;
  createdAt: string;
  updatedAt: string;
};

export type FeeQuery = {
  chainId?: number;
  poolId?: string;
  txHash?: string;
  feeType?: string;
  feeTo?: string;
};

export const feeTypes = [
  { value: "platform", label: "平台费" },
  { value: "tokencreator", label: "创建者费" },
  { value: "subpad", label: "子 pad 费" },
] as const;

export function feeTypeLabel(feeType: string) {
  return feeTypes.find((item) => item.value === feeType)?.label ?? feeType;
}

export function formatFeeAmount(amount: number, decimals: number) {
  if (!Number.isFinite(amount)) return "—";
  const negative = amount < 0;
  const scale = Number.isFinite(decimals) && decimals > 0 ? Math.trunc(decimals) : 0;
  const digits = String(Math.abs(Math.trunc(amount)));
  const padded = digits.padStart(scale + 1, "0");
  const whole = padded.slice(0, padded.length - scale) || "0";
  const fraction = scale === 0 ? "" : padded.slice(padded.length - scale).replace(/0+$/, "");
  const text = fraction ? `${whole}.${fraction}` : whole;
  return negative ? `-${text}` : text;
}

export function listFees(query: FeeQuery) {
  const params = new URLSearchParams();
  if (query.chainId !== undefined) params.set("chainId", String(query.chainId));
  if (query.poolId) params.set("poolId", query.poolId);
  if (query.txHash) params.set("txHash", query.txHash);
  if (query.feeType) params.set("feeType", query.feeType);
  if (query.feeTo) params.set("feeTo", query.feeTo);
  params.set("limit", "200");
  return request<Fee[] | null>(`/api/fee_info/list?${params.toString()}`).then((rows) => rows ?? []);
}
