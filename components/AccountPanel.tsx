"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loginUser, registerUser, updateUser } from "@/lib/user";

type Mode = "login" | "register";

export function AccountPanel() {
  const { user, signIn, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [feeAddr, setFeeAddr] = useState(user?.fee_addr ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const name = username.trim();
    if (!name) {
      setError("请填写用户名");
      return;
    }
    if (!user && !password) {
      setError("请填写密码");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (user) {
        const next = await updateUser(user.id, {
          username: name,
          password,
          feeAddr: feeAddr.trim(),
        });
        signIn({
          id: user.id,
          username: next.username || name,
          fee_addr: next.feeAddr ?? feeAddr.trim(),
          token: user.token,
        });
        setPassword("");
        return;
      }
      const next =
        mode === "register"
          ? await registerUser({ username: name, password, feeAddr: feeAddr.trim() })
          : await loginUser(name, password);
      signIn({
        id: next.id,
        username: next.username || name,
        fee_addr: next.fee_addr ?? "",
        token: next.token,
      });
      setUsername(next.username || name);
      setFeeAddr(next.fee_addr ?? "");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-card">
        <h1>{user ? "修改信息" : mode === "login" ? "登录" : "注册"}</h1>
        {user ? null : (
          <div className="account-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>
              登录
            </button>
            <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")}>
              注册
            </button>
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label className="field">
            用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            密码
            <input
              type="password"
              value={password}
              placeholder={user ? "留空则不修改" : ""}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={user || mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {user || mode === "register" ? (
            <label className="field">
              手续费地址
              <input value={feeAddr} onChange={(event) => setFeeAddr(event.target.value)} />
            </label>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={pending}>
            {user ? "保存" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>
        {user ? (
          <button className="text-button" type="button" onClick={signOut}>
            退出
          </button>
        ) : null}
      </section>
    </main>
  );
}
