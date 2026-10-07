"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { feeTypeLabel, feeTypes, formatFeeAmount, listFees, type Fee, type FeeQuery } from "@/lib/fee";

const emptyForm = {
  chainId: "",
  poolId: "",
  txHash: "",
  feeType: "",
  feeTo: "",
};

function toQuery(form: typeof emptyForm): FeeQuery | string {
  const chainId = form.chainId.trim();
  if (chainId && !/^\d+$/.test(chainId)) return "网络请填写数字";
  const query: FeeQuery = {};
  if (chainId) query.chainId = Number(chainId);
  if (form.poolId.trim()) query.poolId = form.poolId.trim();
  if (form.txHash.trim()) query.txHash = form.txHash.trim();
  if (form.feeType) query.feeType = form.feeType;
  if (form.feeTo.trim()) query.feeTo = form.feeTo.trim();
  return query;
}

export function FeePanel() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<Fee[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listFees({})
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
    const query = toQuery(form);
    if (typeof query === "string") {
      setError(query);
      return;
    }
    setPending(true);
    setError("");
    try {
      setRows(await listFees(query));
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
        <h1>fee管理</h1>
      </div>
      <form className="filter-bar" onSubmit={onSubmit}>
        <label className="field">
          网络
          <input value={form.chainId} onChange={(event) => setForm({ ...form, chainId: event.target.value })} />
        </label>
        <label className="field">
          Pool
          <input value={form.poolId} onChange={(event) => setForm({ ...form, poolId: event.target.value })} />
        </label>
        <label className="field">
          交易哈希
          <input value={form.txHash} onChange={(event) => setForm({ ...form, txHash: event.target.value })} />
        </label>
        <label className="field">
          类型
          <select value={form.feeType} onChange={(event) => setForm({ ...form, feeType: event.target.value })}>
            <option value="">全部</option>
            {feeTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          收款地址
          <input value={form.feeTo} onChange={(event) => setForm({ ...form, feeTo: event.target.value })} />
        </label>
        <button className="primary-button" type="submit" disabled={!user || pending}>
          查询
        </button>
      </form>
      {!user ? <p className="page-hint">请先登录后再查询 fee。</p> : null}
      {user && error ? <p className="form-error">{error}</p> : null}
      {user && loaded && !error && rows.length === 0 ? <p className="page-hint">没有符合条件的 fee。</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="fee-table">
            <thead>
              <tr>
                <th>网络</th>
                <th>Pool</th>
                <th>交易</th>
                <th>类型</th>
                <th>金额</th>
                <th>收款地址</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.chainId}</td>
                  <td>{item.poolId}</td>
                  <td className="mono">{item.txHash}</td>
                  <td>{feeTypeLabel(item.feeType)}</td>
                  <td className="mono">
                    {formatFeeAmount(item.feeAmount, item.feeDecimal)}
                    <span className="fee-token">{item.feeToken}</span>
                  </td>
                  <td className="mono">{item.feeTo}</td>
                  <td>{item.createdAt.replace("T", " ").replace(/\+\d{2}:\d{2}$/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
