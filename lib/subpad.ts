import { request } from "@/lib/api";

export type Subpad = {
  id: number;
  userId: number;
  feeAddr: string;
  brand: string;
  nameFull: string;
  status: number;
  swapType: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type SubpadInput = {
  userId: number;
  brand: string;
  nameFull: string;
  status: number;
  swapType: string;
  description: string;
};

export const subpadStatuses = [
  { value: 0, label: "待审核" },
  { value: 1, label: "有效" },
  { value: 2, label: "停止" },
] as const;

export const swapTypes = [
  { value: "mockSwap", label: "模拟" },
  { value: "uniSwap", label: "真实" },
] as const;

export function statusLabel(status: number) {
  return subpadStatuses.find((item) => item.value === status)?.label ?? String(status);
}

export function swapLabel(swapType: string) {
  return swapTypes.find((item) => item.value === swapType)?.label ?? swapType;
}

export type SubpadQuery = {
  userId?: number;
  brand?: string;
  status?: number;
  swapType?: string;
};

export function listSubpads(query: SubpadQuery = {}) {
  const params = new URLSearchParams();
  if (query.userId !== undefined) params.set("userId", String(query.userId));
  if (query.brand) params.set("brand", query.brand);
  if (query.status !== undefined) params.set("status", String(query.status));
  if (query.swapType) params.set("swapType", query.swapType);
  params.set("limit", "200");
  return request<Subpad[] | null>(`/api/subpad_info/list?${params.toString()}`).then((rows) => rows ?? []);
}

export function createSubpad(input: SubpadInput) {
  return request<Subpad>("/api/subpad_info/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
