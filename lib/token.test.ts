import { afterEach, expect, test, vi } from "vitest";
import { setAuthToken } from "./api";
import { createToken } from "./token";

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
