import { afterEach, expect, test, vi } from "vitest";
import { hostSubpad, parseSubpadHeader } from "./subpad";

const foods = {
  id: 7,
  userId: 3,
  feeAddr: "0x1111111111111111111111111111111111111111",
  brand: "foods",
  nameFull: "Foods Pad",
  status: 1,
  swapType: "mockSwap",
  description: "食品",
  createdAt: "",
  updatedAt: "",
};

function json(body: unknown, header: string | null = null) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "X-Subpad-Info" ? header : null) },
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("解析 X-Subpad-Info", () => {
  expect(parseSubpadHeader(JSON.stringify(foods))).toMatchObject({ id: 7, brand: "foods" });
  expect(parseSubpadHeader(null)).toBeNull();
  expect(() => parseSubpadHeader("{")).toThrow("subpad 信息无效");
  expect(() => parseSubpadHeader(JSON.stringify({ ...foods, id: 0 }))).toThrow("subpad 信息无效");
});

test("响应头按 Latin-1 传来时还原中文", () => {
  const payload = JSON.stringify({ ...foods, nameFull: "我发额范围", description: "食品" });
  const latin1 = [...new TextEncoder().encode(payload)].map((byte) => String.fromCharCode(byte)).join("");
  expect(parseSubpadHeader(latin1)).toMatchObject({ nameFull: "我发额范围", description: "食品" });
  expect(parseSubpadHeader(payload)).toMatchObject({ nameFull: "我发额范围", description: "食品" });
});

test("响应头里的 subpad 就是当前 pad", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ code: 0, message: "ok", data: {} }, JSON.stringify(foods))),
  );
  await expect(hostSubpad()).resolves.toMatchObject({ id: 7, brand: "foods", nameFull: "Foods Pad" });
});

test("没有响应头时是默认 pad，padId 为 0", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ code: 0, message: "ok", data: {} })),
  );
  const pad = await hostSubpad();
  expect(pad.id).toBe(0);
  expect(pad.nameFull).toBe("默认 pad");
  expect(pad.swapType).toBe("mockSwap");
});
