"use client";

import { useEffect, useState } from "react";
import { erc20Abi, isAddress, maxUint256, type Address } from "viem";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { brandFromHost } from "@/lib/brand";
import { getPublicConfig, type PublicConfig } from "@/lib/config";
import { getSubpad, listSubpads, statusLabel, swapLabel, type Subpad } from "@/lib/subpad";
import {
  claimUnits,
  isLocalUsdc,
  launchAddress,
  parseSwapAmount,
  swapAmounts,
  toPoolId,
  type SwapBasis,
  type SwapSide,
} from "@/lib/swap";
import { getToken, type Token } from "@/lib/token";

const launchAbi = [
  {
    type: "function",
    name: "mockSwap",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "swapParams",
        type: "tuple",
        components: [
          { name: "poolId", type: "bytes32" },
          { name: "tokenAmount", type: "int256" },
          { name: "quoteTokenAmount", type: "int256" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const mintAbi = [
  {
    type: "function",
    name: "mintSelfFree",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

function parseTokenId(value: string | undefined) {
  if (!/^[1-9]\d*$/.test(value ?? "")) return "invalid" as const;
  return Number(value);
}

function asAddress(value: string, message: string): Address {
  const addr = value.trim();
  if (!isAddress(addr)) throw new Error(message);
  return addr;
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

function TokenSummary({ token }: { token: Token }) {
  return (
    <dl>
      <dt>名称</dt>
      <dd>{token.tokenName}</dd>
      <dt>符号</dt>
      <dd>{token.tokenSymbol}</dd>
      <dt>合约</dt>
      <dd>{token.tokenAddr}</dd>
      <dt>计价币</dt>
      <dd>
        {token.quoteTokenSymbol || "—"} {token.quoteTokenAddr}
      </dd>
      <dt>poolId</dt>
      <dd>{token.poolId}</dd>
      <dt>padId</dt>
      <dd>{token.subpadId ?? "—"}</dd>
    </dl>
  );
}

export function SwapPanel({ tokenId }: { tokenId?: string }) {
  const id = parseTokenId(tokenId);
  const { user, signOut } = useAuth();
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [token, setToken] = useState<Token | null>(null);
  const [pad, setPad] = useState<Subpad | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [infoError, setInfoError] = useState("");
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [side, setSide] = useState<SwapSide>("buy");
  const [basis, setBasis] = useState<SwapBasis>("token");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || id === "invalid") return;
    let cancelled = false;
    Promise.all([getToken(id), getPublicConfig()])
      .then(async ([nextToken, nextConfig]) => {
        if (cancelled) return;
        setToken(nextToken);
        setConfig(nextConfig);
        const brand = nextToken.subpadId == null ? brandFromHost(window.location.host) : null;
        const nextPad =
          nextToken.subpadId != null
            ? await getSubpad(nextToken.subpadId)
            : brand
              ? ((await listSubpads({ brand }))[0] ?? null)
              : null;
        if (cancelled) return;
        setPad(nextPad);
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
  }, [user, id, signOut]);

  const connected = mounted ? address : undefined;
  const localQuote = Boolean(token && config && isLocalUsdc(token.quoteTokenAddr, config.quoteToken.localUsdc));
  const ready = Boolean(user && connected && token && !pending);

  async function decimalsOf(tokenAddress: Address) {
    if (!publicClient) throw new Error("请先连接钱包");
    return publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" });
  }

  async function approve(tokenAddress: Address, spender: Address) {
    if (!publicClient) throw new Error("请先连接钱包");
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function onTrade(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !connected || !token || !config || !publicClient) return;
    setPending(true);
    setError("");
    setDone("");
    try {
      const launch = launchAddress(config, token.chainId);
      const quote = asAddress(token.quoteTokenAddr, "计价币地址无效");
      const project = asAddress(token.tokenAddr, "合约地址无效");
      const decimals = await decimalsOf(basis === "token" ? project : quote);
      const parsed = parseSwapAmount(amount, decimals);
      const amounts = swapAmounts(side, basis, parsed);
      const spend = side === "buy" ? [quote] : [project, quote];
      for (const tokenAddress of spend) await approve(tokenAddress, launch);
      const hash = await writeContractAsync({
        address: launch,
        abi: launchAbi,
        functionName: "mockSwap",
        args: [{ poolId: toPoolId(token.poolId), ...amounts }],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setDone("已提交");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  async function onClaim() {
    if (!user || !connected || !token || !publicClient) return;
    setPending(true);
    setError("");
    setDone("");
    try {
      const quote = asAddress(token.quoteTokenAddr, "计价币地址无效");
      const decimals = await decimalsOf(quote);
      const hash = await writeContractAsync({
        address: quote,
        abi: mintAbi,
        functionName: "mintSelfFree",
        args: [claimUnits(decimals)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setDone("已领取 1000");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  if (id === "invalid") {
    return (
      <main className="page">
        <p className="page-hint">token 不存在。</p>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="subpad-summary" data-testid="subpad-info">
        <h2>subpad 信息</h2>
        {!user ? <p className="page-hint">请先登录后再交易。</p> : null}
        {user && infoError ? <p className="form-error">{infoError}</p> : null}
        {user && infoLoaded && !infoError && !pad ? <p className="page-hint">没有找到 subpad。</p> : null}
        {pad ? <SubpadSummary pad={pad} showId={token?.subpadId != null} /> : null}
      </section>
      <section className="subpad-summary" data-testid="token-info">
        <h2>token 信息</h2>
        {user && infoLoaded && !infoError && !token ? <p className="page-hint">没有找到 token。</p> : null}
        {token ? <TokenSummary token={token} /> : null}
      </section>
      <div className="page-bar">
        <h1>swap</h1>
      </div>
      <form className="issue-form" onSubmit={onTrade}>
        <div className="swap-choices" role="radiogroup" aria-label="方向">
          <label className="filter-check">
            <input type="radio" name="side" checked={side === "buy"} onChange={() => setSide("buy")} />买
          </label>
          <label className="filter-check">
            <input type="radio" name="side" checked={side === "sell"} onChange={() => setSide("sell")} />卖
          </label>
        </div>
        <div className="swap-choices" role="radiogroup" aria-label="成交依据">
          <label className="filter-check">
            <input type="radio" name="basis" checked={basis === "token"} onChange={() => setBasis("token")} />
            代币数量
          </label>
          <label className="filter-check">
            <input type="radio" name="basis" checked={basis === "quote"} onChange={() => setBasis("quote")} />
            报价币数量
          </label>
        </div>
        <label className="field">
          数量
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        {!connected ? <p className="page-hint">请先连接钱包。</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="form-done">{done}</p> : null}
        <div className="swap-actions">
          <button className="primary-button" type="submit" disabled={!ready}>
            交易
          </button>
          {localQuote ? (
            <button className="primary-button" type="button" onClick={() => void onClaim()} disabled={!ready}>
              领取本地usdc
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
