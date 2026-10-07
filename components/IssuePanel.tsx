"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { useAuth } from "@/components/AuthProvider";
import { TxLog } from "@/components/TxLog";
import { ApiError } from "@/lib/api";
import { getPublicConfig, type PublicConfig } from "@/lib/config";
import { activeChainId } from "@/lib/e2e";
import { launchAddress } from "@/lib/swap";
import { hostSubpad, statusLabel, swapLabel, type Subpad } from "@/lib/subpad";
import { createToken, createTokenAbi, createTokenParams, selectedQuoteToken } from "@/lib/token";
import { appendTxLog, ChainLogError, describeError, traceContractWrite } from "@/lib/txLog";

function SubpadSummary({ pad }: { pad: Subpad }) {
  if (pad.id === 0) {
    return (
      <dl>
        <dt>品牌</dt>
        <dd>默认 pad</dd>
      </dl>
    );
  }
  return (
    <dl>
      <dt>品牌</dt>
      <dd>{pad.brand}</dd>
      <dt>全称</dt>
      <dd>{pad.nameFull}</dd>
      <dt>padId</dt>
      <dd>{pad.id}</dd>
      <dt>状态</dt>
      <dd>{statusLabel(pad.status)}</dd>
      <dt>Swap</dt>
      <dd>{swapLabel(pad.swapType)}</dd>
      <dt>描述</dt>
      <dd>{pad.description || "—"}</dd>
    </dl>
  );
}

export function IssuePanel() {
  const { user, signOut } = useAuth();
  const { address } = useConnection();
  const chainId = activeChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const [pad, setPad] = useState<Subpad | null>(null);
  const [infoError, setInfoError] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [txLog, setTxLog] = useState("");
  const connected = useSyncExternalStore(
    () => () => {},
    () => address,
    () => undefined,
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicConfig(), hostSubpad()])
      .then(([nextConfig, nextPad]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        const next = selectedQuoteToken(nextConfig);
        setQuote(`${next.name} ${next.addr}`);
        setPad(nextPad);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) signOut();
        const message = err instanceof Error ? err.message : "请求失败";
        setError(message);
        setInfoError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !connected || !pad || !config || !publicClient) return;
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
    setTxLog("");
    const push = (entry: unknown) => setTxLog((current) => appendTxLog(current, entry));
    try {
      const quoteToken = selectedQuoteToken(config).addr;
      const params = createTokenParams({
        useMockSwap: pad.swapType === "mockSwap",
        tokenName: name,
        tokenSymbol: symbol,
        quoteToken,
        subpadId: pad.id,
        subpadFeeTo: pad.feeAddr,
      });
      const launch = launchAddress(config, chainId);
      await createToken({
        subpadId: pad.id,
        tokenName: name,
        tokenSymbol: symbol,
        chainId,
      });
      await traceContractWrite(
        push,
        { address: launch, functionName: "createToken", args: [params] },
        () =>
          writeContractAsync({
            address: launch,
            abi: createTokenAbi,
            functionName: "createToken",
            args: [params],
          }),
        (hash) => publicClient.waitForTransactionReceipt({ hash }),
      );
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      if (!(err instanceof ChainLogError)) push({ type: "错误", error: describeError(err) });
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page">
      <section className="subpad-summary" data-testid="subpad-info">
        <h2>subpad 信息</h2>
        {!user ? <p className="page-hint">请先登录后再发币。</p> : null}
        {infoError ? <p className="form-error">{infoError}</p> : null}
        {pad ? <SubpadSummary pad={pad} /> : null}
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
        {!connected ? <p className="page-hint">请先连接钱包。</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="form-done">已提交</p> : null}
        <button className="primary-button" type="submit" disabled={!user || !connected || !pad || pending}>
          提交
        </button>
      </form>
      <TxLog value={txLog} />
    </main>
  );
}
