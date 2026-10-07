export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type BaseResp<T> = {
  code: number;
  message: string;
  data: T;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

const knownMessages: Record<string, string> = {
  "invalid username or password": "用户名或密码错误",
  "username and password are required": "请填写用户名和密码",
  unauthorized: "请重新登录",
  conflict: "已存在",
  "not found": "不存在",
  "mysql is not configured": "后端未配置数据库",
};

function errorMessage(message: string | undefined, status: number) {
  if (message && knownMessages[message]) return knownMessages[message];
  if (message) return message;
  if (status >= 500) return "无法连接后端";
  return `请求失败（${status}）`;
}

export async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (auth && authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`/backend${path}`, { ...init, headers });
  let body: BaseResp<T> | null = null;
  try {
    body = (await response.json()) as BaseResp<T>;
  } catch {
    body = null;
  }
  if (!response.ok || !body || body.code !== 0) {
    throw new ApiError(errorMessage(body?.message, response.status), response.status);
  }
  return body.data;
}
