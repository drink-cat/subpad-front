"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { createToken } from "@/lib/token";

function parsePadId(value: string | undefined) {
  if (value === undefined) return null;
  if (!/^[1-9]\d*$/.test(value)) return "invalid" as const;
  return Number(value);
}

export function IssuePanel({ subpadId }: { subpadId?: string }) {
  const padId = parsePadId(subpadId);
  const { user, signOut } = useAuth();
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || padId === "invalid") return;
    const name = tokenName.trim();
    const symbol = tokenSymbol.trim();
    if (!name || !symbol) {
      setError("请填写 tokenName 和 tokenSymbol");
      setDone(false);
      return;
    }
    setPending(true);
    setError("");
    setDone(false);
    try {
      await createToken({
        ...(padId === null ? {} : { subpadId: padId }),
        tokenName: name,
        tokenSymbol: symbol,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  if (padId === "invalid") {
    return (
      <main className="page">
        <p className="page-hint">pad 不存在。</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-bar">
        <h1>发币</h1>
        <a className="text-link" href="/subpad">
          返回
        </a>
      </div>
      {padId === null ? null : <p className="page-hint pad-id-line">padId {padId}</p>}
      {!user ? <p className="page-hint">请先登录后再发币。</p> : null}
      <form className="issue-form" onSubmit={onSubmit}>
        <label className="field">
          tokenName
          <input value={tokenName} onChange={(event) => setTokenName(event.target.value)} />
        </label>
        <label className="field">
          tokenSymbol
          <input value={tokenSymbol} onChange={(event) => setTokenSymbol(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="form-done">已提交</p> : null}
        <button className="primary-button" type="submit" disabled={!user || pending}>
          提交
        </button>
      </form>
    </main>
  );
}
