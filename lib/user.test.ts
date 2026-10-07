import { afterEach, expect, test, vi } from "vitest";
import { setAuthToken } from "./api";
import { loginUser, registerUser, updateUser } from "./user";

function jwt(claims: object) {
  const payload = btoa(JSON.stringify(claims)).replace(/=+$/g, "");
  return `h.${payload}.s`;
}

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
});

test("登录会校验密码并带上令牌读取资料", async () => {
  const token = jwt({ userId: 3, username: "alice" });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/api/user_info/login")) {
      return json({ code: 0, message: "ok", data: { jwtToken: token } });
    }
    expect(String(url)).toContain("/api/user_info/get?id=3");
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    return json({ code: 0, message: "ok", data: { id: 3, username: "alice", feeAddr: "0xfee" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(loginUser("alice", "secret")).resolves.toMatchObject({
    id: 3,
    username: "alice",
    fee_addr: "0xfee",
    token,
  });
  const loginInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(JSON.parse(String(loginInit.body))).toEqual({ username: "alice", password: "secret" });
  expect(new Headers(loginInit.headers).get("Authorization")).toBeNull();
});

test("密码错误时显示中文", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ code: 401, message: "invalid username or password", data: null }, 401)),
  );
  await expect(loginUser("alice", "bad")).rejects.toThrow("用户名或密码错误");
});

test("注册后继续登录", async () => {
  const token = jwt({ userId: 4, username: "bob" });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/api/user_info/create")) {
      expect(JSON.parse(String(init?.body))).toEqual({
        username: "bob",
        password: "secret",
        feeAddr: "0xfee",
      });
      return json({ code: 0, message: "ok", data: { id: 4, username: "bob", feeAddr: "0xfee" } });
    }
    if (String(url).endsWith("/api/user_info/login")) {
      return json({ code: 0, message: "ok", data: { jwtToken: token } });
    }
    return json({ code: 0, message: "ok", data: { id: 4, username: "bob", feeAddr: "0xfee" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(
    registerUser({ username: "bob", password: "secret", feeAddr: "0xfee" }),
  ).resolves.toMatchObject({ id: 4, username: "bob", token });
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/user_info/create");
});

test("修改资料提交到 update", async () => {
  setAuthToken("token");
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token");
    expect(JSON.parse(String(init?.body))).toEqual({
      id: 3,
      username: "amy",
      password: "",
      feeAddr: "0xabc",
    });
    return json({ code: 0, message: "ok", data: { id: 3, username: "amy", feeAddr: "0xabc" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  await updateUser(3, { username: "amy", password: "", feeAddr: "0xabc" });
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/user_info/update");
});
