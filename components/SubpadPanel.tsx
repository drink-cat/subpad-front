"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import {
  createSubpad,
  deleteSubpad,
  listSubpads,
  statusLabel,
  subpadStatuses,
  swapLabel,
  swapTypes,
  updateSubpad,
  type Subpad,
  type SubpadQuery,
} from "@/lib/subpad";

const emptyForm = {
  brand: "",
  nameFull: "",
  status: "1",
  swapType: "mockSwap",
  description: "",
};

function PadActions({
  id,
  locked,
  onEdit,
  onDelete,
}: {
  id?: number;
  locked: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const createTokenHref = id === undefined ? "/subpad/createToken" : `/subpad/createToken/${id}`;
  return (
    <div className="row-actions">
      {locked ? (
        <button className="primary-button" type="button" disabled>
          发币
        </button>
      ) : (
        <a className="primary-button" href={createTokenHref} target="_blank" rel="noopener noreferrer">
          发币
        </a>
      )}
      {id === undefined ? null : (
        <>
          <button type="button" disabled={locked} onClick={onEdit}>
            修改
          </button>
          <button type="button" disabled={locked} onClick={onDelete}>
            删除
          </button>
        </>
      )}
    </div>
  );
}

const emptyFilter = {
  brand: "",
  status: "",
  swapType: "",
  mine: false,
};

export function SubpadPanel() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<Subpad[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subpad | null>(null);
  const [removing, setRemoving] = useState<Subpad | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState(emptyFilter);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [pending, setPending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load(query: SubpadQuery) {
    setRows(await listSubpads(query));
    setLoaded(true);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listSubpads({})
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

  function currentQuery(): SubpadQuery {
    const query: SubpadQuery = {};
    if (filter.brand.trim()) query.brand = filter.brand.trim();
    if (filter.status) query.status = Number(filter.status);
    if (filter.swapType) query.swapType = filter.swapType;
    if (filter.mine && user) query.userId = user.id;
    return query;
  }

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSearching(true);
    setError("");
    try {
      await load(currentQuery());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setSearching(false);
    }
  }

  function openCreate() {
    if (!user) return;
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
  }

  function openEdit(item: Subpad) {
    if (!user) return;
    setEditing(item);
    setForm({
      brand: item.brand,
      nameFull: item.nameFull,
      status: String(item.status),
      swapType: item.swapType,
      description: item.description,
    });
    setFormError("");
    setOpen(true);
  }

  function openDelete(item: Subpad) {
    if (!user) return;
    setDeleteError("");
    setRemoving(item);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const brand = form.brand.trim();
    const name = form.nameFull.trim();
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
    const fields = {
      brand,
      nameFull: name,
      status: Number(form.status),
      swapType: form.swapType,
      description: form.description.trim(),
    };
    try {
      const saved = editing
        ? await updateSubpad({
            id: editing.id,
            userId: editing.userId,
            feeAddr: editing.feeAddr,
            ...fields,
          })
        : await createSubpad({ userId: user.id, ...fields });
      setRows((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setOpen(false);
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setFormError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!user || !removing) return;
    setPending(true);
    setDeleteError("");
    try {
      await deleteSubpad(removing.id);
      setRows((current) => current.filter((item) => item.id !== removing.id));
      setRemoving(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      setDeleteError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page page-wide">
      <div className="page-bar">
        <h1>subpad管理</h1>
        <button className="primary-button" type="button" onClick={openCreate} disabled={!user}>
          新建 subpad
        </button>
      </div>
      <section className="default-pad" data-testid="default-pad">
        <strong>默认 pad</strong>
        <PadActions locked={!user} />
      </section>
      <form className="filter-bar" onSubmit={onSearch}>
        <label className="field">
          品牌
          <input value={filter.brand} onChange={(event) => setFilter({ ...filter, brand: event.target.value })} />
        </label>
        <label className="field">
          状态
          <select value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}>
            <option value="">全部</option>
            {subpadStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Swap 类型
          <select
            value={filter.swapType}
            onChange={(event) => setFilter({ ...filter, swapType: event.target.value })}
          >
            <option value="">全部</option>
            {swapTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filter.mine}
            onChange={(event) => setFilter({ ...filter, mine: event.target.checked })}
          />
          看我的subpad
        </label>
        <button className="primary-button" type="submit" disabled={!user || searching}>
          查询
        </button>
      </form>
      {!user ? <p className="page-hint">请先登录后再管理 subpad。</p> : null}
      {user && error ? <p className="form-error">{error}</p> : null}
      {user && loaded && !error && rows.length === 0 ? <p className="page-hint">没有符合条件的 subpad。</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="subpad-table">
            <thead>
              <tr>
                <th>品牌</th>
                <th>全称</th>
                <th>padId</th>
                <th>Swap</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.brand}</td>
                  <td>{item.nameFull}</td>
                  <td>{item.id}</td>
                  <td>{swapLabel(item.swapType)}</td>
                  <td>{statusLabel(item.status)}</td>
                  <td>
                    <PadActions
                      id={item.id}
                      locked={!user}
                      onEdit={() => openEdit(item)}
                      onDelete={() => openDelete(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <h2 id="create-subpad-title">{editing ? "修改 subpad" : "新建 subpad"}</h2>
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
                  value={form.nameFull}
                  onChange={(event) => setForm({ ...form, nameFull: event.target.value })}
                />
              </label>
              <label className="field">
                Swap 类型
                <select
                  value={form.swapType}
                  onChange={(event) => setForm({ ...form, swapType: event.target.value })}
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
                <button className="primary-button" type="submit" disabled={!user || pending}>
                  提交
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {removing ? (
        <div className="modal-backdrop" onClick={() => setRemoving(null)}>
          <section
            className="panel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subpad-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-subpad-title">删除 subpad</h2>
            <p className="page-hint">确认删除 {removing.brand}？</p>
            {deleteError ? <p className="form-error">{deleteError}</p> : null}
            <div className="dialog-actions">
              <button className="text-button" type="button" onClick={() => setRemoving(null)}>
                取消
              </button>
              <button className="primary-button" type="button" onClick={() => void onDelete()} disabled={!user || pending}>
                删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
