/** Anvil 默认第一个账户，只用于本地 e2e。 */
const ANVIL_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export function isLocalEnv() {
  return process.env.NEXT_PUBLIC_CHAIN_ENV !== "testnet";
}

export type E2EInjected = {
  rpc: string;
  chainId: number;
  privateKey: `0x${string}`;
};

declare global {
  interface Window {
    e2e?: E2EInjected;
  }
}

export function defaultE2E(): E2EInjected {
  return {
    rpc: process.env.NEXT_PUBLIC_E2E_RPC ?? "http://127.0.0.1:8545",
    chainId: Number(process.env.NEXT_PUBLIC_E2E_CHAIN_ID ?? "31337"),
    privateKey: (process.env.NEXT_PUBLIC_E2E_PRIVATE_KEY ?? ANVIL_KEY) as `0x${string}`,
  };
}

/** dev 默认本地网。测试网把 NEXT_PUBLIC_CHAIN_ENV 设为 testnet。 */
export function readE2E(): E2EInjected | null {
  if (!isLocalEnv()) return null;
  if (typeof window === "undefined") return defaultE2E();
  if (!window.e2e) window.e2e = defaultE2E();
  return window.e2e;
}
