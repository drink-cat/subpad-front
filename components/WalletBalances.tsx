"use client";

import { useQuery } from "@tanstack/react-query";
import { formatEth, formatUsdc, readBalances } from "@/lib/balance";

export function WalletBalances({ address, chainId }: { address: `0x${string}`; chainId: number }) {
  const balances = useQuery({
    queryKey: ["wallet-balances", chainId, address],
    queryFn: () => readBalances(chainId, address),
  });

  const eth = balances.isPending ? "读取中" : balances.isError ? "读取失败" : formatEth(balances.data.eth);
  const usdc = balances.isPending
    ? "读取中"
    : balances.isError
      ? "读取失败"
      : balances.data.usdc === null
        ? "—"
        : formatUsdc(balances.data.usdc);

  return (
    <dl className="balance-list">
      <div className="balance-row">
        <dt>ETH</dt>
        <dd data-testid="eth-balance">{eth}</dd>
      </div>
      <div className="balance-row">
        <dt>USDC</dt>
        <dd data-testid="usdc-balance">{usdc}</dd>
      </div>
    </dl>
  );
}
