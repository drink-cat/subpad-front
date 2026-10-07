import { request, setAuthToken } from "@/lib/api";
import { readJwt, type SessionUser } from "@/lib/session";

type UserProfile = {
  id: number;
  username: string;
  feeAddr: string;
};

async function loadProfile(token: string, username: string): Promise<SessionUser> {
  const claims = readJwt(token);
  if (!claims) throw new Error("登录失败");
  setAuthToken(token);
  try {
    const profile = await request<UserProfile>(`/api/user_info/get?id=${claims.userId}`);
    return {
      id: profile.id,
      username: profile.username || claims.username || username,
      fee_addr: profile.feeAddr ?? "",
      token,
    };
  } catch {
    return { id: claims.userId, username: claims.username || username, fee_addr: "", token };
  }
}

export async function loginUser(username: string, password: string): Promise<SessionUser> {
  const data = await request<{ jwtToken: string }>(
    "/api/user_info/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
  return loadProfile(data.jwtToken, username);
}

export async function registerUser(input: { username: string; password: string; feeAddr: string }) {
  await request(
    "/api/user_info/create",
    { method: "POST", body: JSON.stringify(input) },
    false,
  );
  return loginUser(input.username, input.password);
}

export async function updateUser(
  id: number,
  input: { username: string; password: string; feeAddr: string },
) {
  return request<UserProfile>("/api/user_info/update", {
    method: "POST",
    body: JSON.stringify({ id, ...input }),
  });
}
