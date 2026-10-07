"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { brandFromHost } from "@/lib/brand";
import { getPublicConfig } from "@/lib/config";
import { getSubpad, listSubpads, statusLabel, swapLabel, type Subpad } from "@/lib/subpad";
import { createToken, selectedQuoteToken } from "@/lib/token";

function parsePadId(value: string | undefined) {
  if (value === undefined) return null;
  if (!/^[1-9]\d*$/.test(value)) return "invalid" as const;
  return Number(value);
}

function SubpadSummary({ pad, showId }: { pad: Subpad; showId: boolean }) {
  return (
    <dl>
      <dt>品牌</dt>
      <dd>{pad.brand}</dd>
      <dt>全称</dt>
      <dd>{pad.nameFull}</dd>
      {showId ? (
        <>
          <dt>padId</dt>
          <dd>{pad.id}</dd>
        </>
      ) : null}
      <dt>状态</dt>
      <dd>{statusLabel(pad.status)}</dd>
      <dt>Swap</dt>
      <dd>{swapLabel(pad.swapType)}</dd>
      <dt>描述</dt>
      <dd>{pad.description || "—"}</dd>
    </dl>
  );
}

export function IssuePanel({ subpadId }: { subpadId?: string }) {
  const padId = parsePadId(subpadId);
  const { user, signOut } = useAuth();
  const [pad, setPad] = useState<Subpad | null>(null);
  const [infoError, setInfoError] = useState("");
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (padId === "invalid") return;
    let cancelled = false;
    getPublicConfig()
      .then((config) => {
        if (cancelled) return;
        const next = selectedQuoteToken(config);
        setQuote(`${next.name} ${next.addr}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "请求失败");
      });
    return () => {
      cancelled = true;
    };
  }, [padId]);

  useEffect(() => {
    if (!user || padId === "invalid") return;
    let cancelled = false;
    const brand = padId === null ? brandFromHost(window.location.host) : null;
    const task =
      padId === null
        ? brand
          ? listSubpads({ brand }).then((rows) => rows[0] ?? null)
          : Promise.resolve(null)
        : getSubpad(padId);
    task
      .then((next) => {
        if (cancelled) return;
        setPad(next);
        setInfoLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) signOut();
        setInfoError(err instanceof Error ? err.message : "请求失败");
        setInfoLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, padId, signOut]);

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
      <section className="subpad-summary" data-testid="subpad-info">
        <h2>subpad 信息</h2>
        {!user ? <p className="page-hint">请先登录后再发币。</p> : null}
        {user && infoError ? <p className="form-error">{infoError}</p> : null}
        {user && infoLoaded && !infoError && !pad ? <p className="page-hint">没有找到 subpad。</p> : null}
        {pad ? <SubpadSummary pad={pad} showId={padId !== null} /> : null}
      </section>
      <div className="page-bar">
        <h1>发币</h1>
        <a className="text-link" href="/subpad">
          返回
        </a>
      </div>
      <form className="issue-form" onSubmit={onSubmit}>
        <div className="issue-grid">
          <label htmlFor="token-name">tokenName</label>
          <input id="token-name" value={tokenName} onChange={(event) => setTokenName(event.target.value)} />
          <label htmlFor="token-symbol">tokenSymbol</label>
          <input id="token-symbol" value={tokenSymbol} onChange={(event) => setTokenSymbol(event.target.value)} />
          <label htmlFor="quote-token">quoteToken</label>
          <input id="quote-token" readOnly value={quote} />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="form-done">已提交</p> : null}
        <button className="primary-button" type="submit" disabled={!user || pending}>
          提交
        </button>
      </form>
    </main>
  );
}
