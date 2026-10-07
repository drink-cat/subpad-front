import { request } from "@/lib/api";

export type Fee = {
  id: number;
  chainid: number;
  pool_id: string;
  tx_hash: string;
  fee_type: string;
  fee_token: string;
  fee_decimal: number;
  fee_amount: number;
  fee_to: string;
  created_at: string;
};

export type FeeQuery = {
  chainid?: number;
  pool_id?: string;
  tx_hash?: string;
  fee_type?: string;
  fee_to?: string;
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
  if (query.chainid !== undefined) params.set("chainid", String(query.chainid));
  if (query.pool_id) params.set("pool_id", query.pool_id);
  if (query.tx_hash) params.set("tx_hash", query.tx_hash);
  if (query.fee_type) params.set("fee_type", query.fee_type);
  if (query.fee_to) params.set("fee_to", query.fee_to);
  params.set("limit", "200");
  return request<Fee[] | null>(`/api/fee_info/list?${params.toString()}`).then((rows) => rows ?? []);
}
