import { zeroAddress } from "viem";
import { afterEach, expect, test, vi } from "vitest";
import { setAuthToken } from "./api";
import { createToken, createTokenParams, initPrice, launchSupply, listTokens, tokenDecimals } from "./token";

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const config = {
  code: 0,
  message: "ok",
  data: {
    quoteToken: { localUsdc: "0xlocal", sepoliaUsdc: "0xsep" },
    syncLog: [],
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setAuthToken(null);
});

test("发币参数对齐 createToken", () => {
  expect(
    createTokenParams({
      useMockSwap: true,
      tokenName: "Foods",
      tokenSymbol: "FOOD",
      quoteToken: "0x2222222222222222222222222222222222222222",
      subpadId: 7,
      subpadFeeTo: "0x1111111111111111111111111111111111111111",
    }),
  ).toEqual({
    useMockSwap: true,
    tokenName: "Foods",
    tokenSymbol: "FOOD",
    tokenDecimals,
    totalSupply: launchSupply,
    quoteToken: "0x2222222222222222222222222222222222222222",
    initPrice,
    subpadId: 7n,
    subpadFeeTo: "0x1111111111111111111111111111111111111111",
  });
  expect(
    createTokenParams({
      useMockSwap: false,
      tokenName: "Foods",
      tokenSymbol: "FOOD",
      quoteToken: "0x2222222222222222222222222222222222222222",
    }).subpadFeeTo,
  ).toBe(zeroAddress);
  expect(() =>
    createTokenParams({
      useMockSwap: true,
      tokenName: "Foods",
      tokenSymbol: "FOOD",
      quoteToken: "0x2222222222222222222222222222222222222222",
      subpadId: 7,
      subpadFeeTo: "0xfee",
    }),
  ).toThrow("子 pad 费用地址无效");
});

test("本机发币使用 localUsdc", async () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "local");
  setAuthToken("token");
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/api/config")) {
      expect(new Headers(init?.headers).get("Authorization")).toBeNull();
      return json(config);
    }
    expect(String(url)).toContain("/api/token_info/create");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token");
    expect(JSON.parse(String(init?.body))).toEqual({
      tokenName: "Foods",
      tokenSymbol: "FOOD",
      quoteTokenAddr: "0xlocal",
    });
    return json({ code: 0, message: "ok", data: {} });
  });
  vi.stubGlobal("fetch", fetchMock);

  await createToken({ tokenName: "Foods", tokenSymbol: "FOOD" });
});

test("按条件查询 token 列表", async () => {
  setAuthToken("token");
  const fetchMock = vi.fn(async (url: string) => {
    const target = new URL(String(url), "http://local");
    expect(target.pathname).toBe("/backend/api/token_info/list");
    expect(target.searchParams.get("tokenSymbol")).toBe("FOOD");
    expect(target.searchParams.get("userId")).toBe("3");
    expect(target.searchParams.get("limit")).toBe("200");
    return json({ code: 0, message: "ok", data: null });
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(listTokens({ tokenSymbol: "FOOD", userId: 3 })).resolves.toEqual([]);
});

test("测试网发币使用 sepoliaUsdc", async () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/api/config")) return json(config);
    expect(JSON.parse(String(init?.body)).quoteTokenAddr).toBe("0xsep");
    return json({ code: 0, message: "ok", data: {} });
  });
  vi.stubGlobal("fetch", fetchMock);

  await createToken({ subpadId: 7, tokenName: "Foods", tokenSymbol: "FOOD" });
});
