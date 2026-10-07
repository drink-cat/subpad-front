import { request } from "@/lib/api";

export type Subpad = {
  id: number;
  user_id: number;
  user_addr: string;
  brand: string;
  name_full: string;
  status: number;
  swap_type: string;
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
  user_id?: number;
  brand?: string;
  status?: number;
  swap_type?: string;
};

export function listSubpads(query: SubpadQuery = {}) {
  const params = new URLSearchParams();
  if (query.user_id !== undefined) params.set("user_id", String(query.user_id));
  if (query.brand) params.set("brand", query.brand);
  if (query.status !== undefined) params.set("status", String(query.status));
  if (query.swap_type) params.set("swap_type", query.swap_type);
  params.set("limit", "200");
  return request<Subpad[] | null>(`/api/subpad_info/list?${params.toString()}`).then((rows) => rows ?? []);
}

export function createSubpad(input: Omit<Subpad, "id">) {
  return request<Subpad>("/api/subpad_info/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
