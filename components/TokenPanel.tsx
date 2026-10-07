"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { listTokens, type Token, type TokenQuery } from "@/lib/token";

const emptyForm = {
  tokenSymbol: "",
  tokenAddr: "",
  poolId: "",
  creator: "",
  chainId: "",
  subpadId: "",
  mine: false,
};

function toQuery(form: typeof emptyForm, userId: number): TokenQuery | string {
  const chainId = form.chainId.trim();
  const subpadId = form.subpadId.trim();
  if (chainId && !/^\d+$/.test(chainId)) return "网络请填写数字";
  if (subpadId && !/^\d+$/.test(subpadId)) return "padId 请填写数字";
  const query: TokenQuery = {};
  if (form.tokenSymbol.trim()) query.tokenSymbol = form.tokenSymbol.trim();
  if (form.tokenAddr.trim()) query.tokenAddr = form.tokenAddr.trim();
  if (form.poolId.trim()) query.poolId = form.poolId.trim();
  if (form.creator.trim()) query.creator = form.creator.trim();
  if (chainId) query.chainId = Number(chainId);
  if (subpadId) query.subpadId = Number(subpadId);
  if (form.mine) query.userId = userId;
  return query;
}

export function TokenPanel() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<Token[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listTokens({})
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) signOut();
        setError(err instanceof Error ? err.message : "请求失败");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, signOut]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const query = toQuery(form, user.id);
    if (typeof query === "string") {
      setError(query);
      return;
    }
    setPending(true);
    setError("");
    try {
      setRows(await listTokens(query));
      setLoaded(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page page-wide">
      <div className="page-bar">
        <h1>token页</h1>
      </div>
      <form className="filter-bar" onSubmit={onSubmit}>
        <label className="field">
          符号
          <input value={form.tokenSymbol} onChange={(event) => setForm({ ...form, tokenSymbol: event.target.value })} />
        </label>
        <label className="field">
          合约
          <input value={form.tokenAddr} onChange={(event) => setForm({ ...form, tokenAddr: event.target.value })} />
        </label>
        <label className="field">
          Pool
          <input value={form.poolId} onChange={(event) => setForm({ ...form, poolId: event.target.value })} />
        </label>
        <label className="field">
          创建者
          <input value={form.creator} onChange={(event) => setForm({ ...form, creator: event.target.value })} />
        </label>
        <label className="field">
          网络
          <input value={form.chainId} onChange={(event) => setForm({ ...form, chainId: event.target.value })} />
        </label>
        <label className="field">
          padId
          <input value={form.subpadId} onChange={(event) => setForm({ ...form, subpadId: event.target.value })} />
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={form.mine}
            onChange={(event) => setForm({ ...form, mine: event.target.checked })}
          />
          看我的token
        </label>
        <button className="primary-button" type="submit" disabled={!user || pending}>
          查询
        </button>
      </form>
      {!user ? <p className="page-hint">请先登录后再查询 token。</p> : null}
      {user && error ? <p className="form-error">{error}</p> : null}
      {user && loaded && !error && rows.length === 0 ? <p className="page-hint">没有符合条件的 token。</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="token-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>符号</th>
                <th>合约</th>
                <th>计价币</th>
                <th>Pool</th>
                <th>padId</th>
                <th>创建者</th>
                <th>网络</th>
                <th>发行量</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.tokenName}</td>
                  <td>{item.tokenSymbol}</td>
                  <td className="mono">{item.tokenAddr}</td>
                  <td>
                    {item.quoteTokenSymbol || "—"}
                    {item.quoteTokenAddr ? <span className="fee-token">{item.quoteTokenAddr}</span> : null}
                  </td>
                  <td className="mono">{item.poolId}</td>
                  <td>{item.subpadId ?? "—"}</td>
                  <td className="mono">{item.creator}</td>
                  <td>{item.chainId}</td>
                  <td>{item.launchSupply}</td>
                  <td>
                    <div className="row-actions">
                      <a href={`/swap/${item.id}`} target="_blank" rel="noopener noreferrer">
                        交易
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
