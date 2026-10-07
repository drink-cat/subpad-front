"use client";

import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import {
  createSubpad,
  listSubpads,
  statusLabel,
  subpadStatuses,
  swapLabel,
  swapTypes,
  type Subpad,
} from "@/lib/subpad";

const emptyForm = {
  brand: "",
  name_full: "",
  user_addr: "",
  status: "1",
  swap_type: "mockSwap",
  description: "",
};

export function SubpadPanel() {
  const { user, signOut } = useAuth();
  const { address } = useConnection();
  const [rows, setRows] = useState<Subpad[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listSubpads(user.id)
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

  function openCreate() {
    setForm({ ...emptyForm, user_addr: address ?? "" });
    setFormError("");
    setOpen(true);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const brand = form.brand.trim();
    const name = form.name_full.trim();
    if (!/^[A-Za-z0-9-]+$/.test(brand)) {
      setFormError("品牌请使用英文、数字或连字符");
      return;
    }
    if (!name) {
      setFormError("请填写全称");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const created = await createSubpad({
        user_id: user.id,
        user_addr: form.user_addr.trim(),
        brand,
        name_full: name,
        status: Number(form.status),
        swap_type: form.swap_type,
        description: form.description.trim(),
      });
      setRows((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setFormError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page">
      <div className="page-bar">
        <h1>subpad管理</h1>
        <button className="primary-button" type="button" onClick={openCreate} disabled={!user}>
          新建 subpad
        </button>
      </div>
      {!user ? <p className="page-hint">请先登录后再管理 subpad。</p> : null}
      {user && error ? <p className="form-error">{error}</p> : null}
      {user && loaded && !error && rows.length === 0 ? <p className="page-hint">还没有 subpad。</p> : null}
      {rows.length > 0 ? (
        <ul className="subpad-list">
          {rows.map((item) => (
            <li key={item.id} className="subpad-card">
              <strong>{item.name_full}</strong>
              <span>{item.brand}</span>
              <span>{swapLabel(item.swap_type)}</span>
              <span>{statusLabel(item.status)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section
            className="panel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-subpad-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="create-subpad-title">新建 subpad</h2>
            <form onSubmit={onSubmit}>
              <label className="field">
                品牌
                <input
                  value={form.brand}
                  onChange={(event) => setForm({ ...form, brand: event.target.value })}
                />
              </label>
              <label className="field">
                全称
                <input
                  value={form.name_full}
                  onChange={(event) => setForm({ ...form, name_full: event.target.value })}
                />
              </label>
              <label className="field">
                钱包地址
                <input
                  value={form.user_addr}
                  onChange={(event) => setForm({ ...form, user_addr: event.target.value })}
                />
              </label>
              <label className="field">
                Swap 类型
                <select
                  value={form.swap_type}
                  onChange={(event) => setForm({ ...form, swap_type: event.target.value })}
                >
                  {swapTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                状态
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  {subpadStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                描述
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              {formError ? <p className="form-error">{formError}</p> : null}
              <div className="dialog-actions">
                <button className="text-button" type="button" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button className="primary-button" type="submit" disabled={pending}>
                  提交
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
