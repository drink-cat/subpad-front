export type ChainEnv = "local" | "testnet";

export function getChainEnv(): ChainEnv {
  return process.env.NEXT_PUBLIC_CHAIN_ENV === "testnet" ? "testnet" : "local";
}

export function getWalletConnectProjectId(): string | undefined {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) return undefined;
  return projectId;
}
