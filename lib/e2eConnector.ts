import {
  createPublicClient,
  createWalletClient,
  http,
  numberToHex,
  type Address,
  type Chain,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createConnector } from "wagmi";
import type { E2EInjected } from "@/lib/e2e";

type TxRequest = {
  to?: Address;
  data?: Hex;
  value?: Hex;
  gas?: Hex;
  nonce?: Hex;
  gasPrice?: Hex;
  maxFeePerGas?: Hex;
  maxPriorityFeePerGas?: Hex;
};

/** 用私钥在本地签名，再把交易发到 window.e2e.rpc。不走 MetaMask。 */
export function e2eConnector(injected: E2EInjected, chain: Chain) {
  const account = privateKeyToAccount(injected.privateKey);
  const transport = http(injected.rpc);
  const walletClient = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  const provider = {
    on() {},
    removeListener() {},
    async request({ method, params }: { method: string; params?: readonly unknown[] }) {
      if (method === "eth_chainId") return numberToHex(chain.id);
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [account.address];
      if (method === "eth_sendTransaction") {
        const tx = (params?.[0] ?? {}) as TxRequest;
        return walletClient.sendTransaction({
          account,
          chain,
          to: tx.to,
          data: tx.data,
          value: tx.value !== undefined ? BigInt(tx.value) : undefined,
          gas: tx.gas !== undefined ? BigInt(tx.gas) : undefined,
          nonce: tx.nonce !== undefined ? Number(tx.nonce) : undefined,
          ...(tx.maxFeePerGas
            ? {
                maxFeePerGas: BigInt(tx.maxFeePerGas),
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
              }
            : tx.gasPrice
              ? { gasPrice: BigInt(tx.gasPrice) }
              : {}),
        });
      }
      if (method === "personal_sign") {
        const [data] = (params ?? []) as [Hex];
        return walletClient.signMessage({ account, message: { raw: data } });
      }
      if (method === "eth_signTypedData_v4") {
        const [, data] = (params ?? []) as [Address, string];
        return walletClient.signTypedData({ account, ...JSON.parse(data) } as never);
      }
      if (method === "wallet_switchEthereumChain") {
        const next = Number((params?.[0] as { chainId?: string } | undefined)?.chainId ?? chain.id);
        if (next !== chain.id) throw new Error("E2E 只连接配置的这条链");
        return null;
      }
      return publicClient.request({ method, params } as never);
    },
  };

  return createConnector(() => ({
    id: "e2e",
    name: "E2E",
    type: "e2e",
    async connect({ withCapabilities }: { withCapabilities?: boolean } = {}) {
      const accounts = withCapabilities
        ? [{ address: account.address, capabilities: {} }]
        : [account.address];
      return { accounts, chainId: chain.id } as never;
    },
    async disconnect() {},
    async getAccounts() {
      return [account.address] as const;
    },
    async getChainId() {
      return chain.id;
    },
    async isAuthorized() {
      return true;
    },
    async getProvider() {
      return provider;
    },
    async switchChain({ chainId }: { chainId: number }) {
      if (chainId !== chain.id) throw new Error("E2E 只连接配置的这条链");
      return chain;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
}
