export const userCookieName = "subpad_user";

export type SessionUser = {
  id: number;
  username: string;
  fee_addr: string;
  token: string;
};

export function readJwt(token: string): { userId: number; username: string } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes)) as {
      userId?: unknown;
      username?: unknown;
    };
    const userId = typeof json.userId === "number" ? json.userId : Number(json.userId);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return { userId, username: typeof json.username === "string" ? json.username : "" };
  } catch {
    return null;
  }
}

export function parseUserCookie(raw: string | undefined | null): SessionUser | null {
  if (!raw) return null;
  try {
    const text = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const data = JSON.parse(text) as Partial<SessionUser>;
    if (
      typeof data.id !== "number" ||
      typeof data.username !== "string" ||
      !data.username ||
      typeof data.token !== "string" ||
      !data.token
    ) {
      return null;
    }
    return {
      id: data.id,
      username: data.username,
      fee_addr: typeof data.fee_addr === "string" ? data.fee_addr : "",
      token: data.token,
    };
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number) {
  document.cookie = `${userCookieName}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function writeUserCookie(user: SessionUser | null) {
  if (user) {
    writeCookie(encodeURIComponent(JSON.stringify(user)), 60 * 60 * 72);
    return;
  }
  writeCookie("", 0);
}

export function readUserCookie(): SessionUser | null {
  const part = document.cookie.split("; ").find((item) => item.startsWith(`${userCookieName}=`));
  return parseUserCookie(part?.slice(userCookieName.length + 1));
}
