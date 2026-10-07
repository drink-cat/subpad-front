import {
  createPublicClient,
  defineChain,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { defaultE2E } from "@/lib/e2e";

const MAINNET_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

const clients = new Map<number, PublicClient>();

function localChain(): Chain {
  const e2e = defaultE2E();
  return defineChain({
    id: e2e.chainId,
    name: "Local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [e2e.rpc] } },
  });
}

function clientFor(chainId: number) {
  const existing = clients.get(chainId);
  if (existing) return existing;

  const e2e = defaultE2E();
  const chain = chainId === mainnet.id ? mainnet : chainId === sepolia.id ? sepolia : chainId === e2e.chainId ? localChain() : null;
  if (!chain) return null;

  const rpc =
    chainId === mainnet.id
      ? "https://ethereum.publicnode.com"
      : chainId === sepolia.id
        ? "https://ethereum-sepolia.publicnode.com"
        : e2e.rpc;
  const client = createPublicClient({ chain, transport: http(rpc) });
  clients.set(chainId, client);
  return client;
}

export function usdcAddress(chainId: number): Address | null {
  if (chainId === mainnet.id) return MAINNET_USDC;
  if (chainId === sepolia.id) return SEPOLIA_USDC;
  return null;
}

export async function readBalances(chainId: number, address: Address) {
  const client = clientFor(chainId);
  if (!client) throw new Error("这条链没有可用的余额节点");
  const token = usdcAddress(chainId);
  const [eth, usdc] = await Promise.all([
    client.getBalance({ address }),
    token
      ? client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        })
      : Promise.resolve(null),
  ]);
  return { eth, usdc };
}

export function formatTokenAmount(value: bigint, decimals: number) {
  return formatUnits(value, decimals);
}

export function formatEth(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, 18).split(".");
  const shown = fraction.replace(/0+$/, "").slice(0, 6);
  return shown ? `${whole}.${shown}` : whole;
}

export function formatUsdc(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, 6).split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const shown = trimmed.length < 2 ? trimmed.padEnd(2, "0") : trimmed;
  return `${whole}.${shown}`;
}
