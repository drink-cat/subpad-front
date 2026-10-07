"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { feeTypeLabel, feeTypes, formatFeeAmount, listFees, type Fee, type FeeQuery } from "@/lib/fee";

const emptyForm = {
  chainid: "",
  pool_id: "",
  tx_hash: "",
  fee_type: "",
  fee_to: "",
};

function toQuery(form: typeof emptyForm): FeeQuery | string {
  const chainid = form.chainid.trim();
  if (chainid && !/^\d+$/.test(chainid)) return "网络请填写数字";
  const query: FeeQuery = {};
  if (chainid) query.chainid = Number(chainid);
  if (form.pool_id.trim()) query.pool_id = form.pool_id.trim();
  if (form.tx_hash.trim()) query.tx_hash = form.tx_hash.trim();
  if (form.fee_type) query.fee_type = form.fee_type;
  if (form.fee_to.trim()) query.fee_to = form.fee_to.trim();
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
          <input value={form.chainid} onChange={(event) => setForm({ ...form, chainid: event.target.value })} />
        </label>
        <label className="field">
          Pool
          <input value={form.pool_id} onChange={(event) => setForm({ ...form, pool_id: event.target.value })} />
        </label>
        <label className="field">
          交易哈希
          <input value={form.tx_hash} onChange={(event) => setForm({ ...form, tx_hash: event.target.value })} />
        </label>
        <label className="field">
          类型
          <select value={form.fee_type} onChange={(event) => setForm({ ...form, fee_type: event.target.value })}>
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
          <input value={form.fee_to} onChange={(event) => setForm({ ...form, fee_to: event.target.value })} />
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
                  <td>{item.chainid}</td>
                  <td>{item.pool_id}</td>
                  <td className="mono">{item.tx_hash}</td>
                  <td>{feeTypeLabel(item.fee_type)}</td>
                  <td className="mono">
                    {formatFeeAmount(item.fee_amount, item.fee_decimal)}
                    <span className="fee-token">{item.fee_token}</span>
                  </td>
                  <td className="mono">{item.fee_to}</td>
                  <td>{item.created_at.replace("T", " ").replace(/\+\d{2}:\d{2}$/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
