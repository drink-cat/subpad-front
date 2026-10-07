import { request, subpadInfoHeaderValue } from "@/lib/api";
import { isLocalEnv } from "@/lib/e2e";

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

export function defaultSubpad(): Subpad {
  return {
    id: 0,
    userId: 0,
    feeAddr: "",
    brand: "",
    nameFull: "默认 pad",
    status: 1,
    swapType: isLocalEnv() ? "mockSwap" : "uniSwap",
    description: "",
    createdAt: "",
    updatedAt: "",
  };
}

/** fetch 按 Latin-1 读取响应头，后端写入的是 UTF-8 JSON。 */
function subpadHeaderText(raw: string) {
  if ([...raw].some((char) => char.charCodeAt(0) > 255)) return raw;
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return decoded.includes("\uFFFD") ? raw : decoded;
}

export function parseSubpadHeader(raw: string | null) {
  if (!raw) return null;
  let row: Subpad;
  try {
    row = JSON.parse(subpadHeaderText(raw)) as Subpad;
  } catch {
    throw new Error("subpad 信息无效");
  }
  if (!row || typeof row.id !== "number" || row.id <= 0) throw new Error("subpad 信息无效");
  return row;
}

/** 读最近一次接口响应的 X-Subpad-Info。没有这个头时是默认 pad，padId 为 0。 */
export async function hostSubpad() {
  await request<unknown>("/api/config", undefined, false);
  return parseSubpadHeader(subpadInfoHeaderValue()) ?? defaultSubpad();
}

export function getSubpad(id: number) {
  return request<Subpad>(`/api/subpad_info/get?id=${id}`);
}

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

export function updateSubpad(input: SubpadInput & { id: number; feeAddr: string }) {
  return request<Subpad>("/api/subpad_info/update", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteSubpad(id: number) {
  return request<null>("/api/subpad_info/delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
