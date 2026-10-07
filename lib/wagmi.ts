import { defineChain } from "viem";
import { cookieStorage, createConfig, createStorage, http, type Config } from "wagmi";
import { sepolia } from "wagmi/chains";
import { walletConnect } from "wagmi/connectors/walletConnect";
import { e2eConnector } from "@/lib/e2eConnector";
import { readE2E, type E2EInjected } from "@/lib/e2e";
import { getWalletConnectProjectId } from "@/lib/env";

const COOKIE_LIMIT = 3800;

function decodeCookieValue(value: string) {
  if (!value.includes("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readableJson(value: string) {
  const decoded = decodeCookieValue(value);
  try {
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

/** 坏掉或超长的钱包 cookie 会让整页 500，读失败时丢掉它。 */
const safeCookieStorage = {
  getItem(key: string) {
    const raw = cookieStorage.getItem(key);
    if (!raw) return null;
    const value = readableJson(raw);
    if (value) return value;
    cookieStorage.removeItem(key);
    return null;
  },
  setItem(key: string, value: string) {
    if (value.length > COOKIE_LIMIT) {
      cookieStorage.removeItem(key);
      return;
    }
    cookieStorage.setItem(key, value);
  },
  removeItem(key: string) {
    cookieStorage.removeItem(key);
  },
};

let relayError: string | null = null;

export function getWalletRelayError() {
  return relayError;
}

if (typeof window !== "undefined" && typeof window.WebSocket === "function") {
  const OriginalSocket = window.WebSocket;
  const PatchedSocket = function (url: string | URL, protocols?: string | string[]) {
    const target = String(url);
    const socket = protocols === undefined ? new OriginalSocket(url) : new OriginalSocket(url, protocols);
    if (target.includes("relay.walletconnect.org")) {
      socket.addEventListener("close", (event) => {
        if (event.reason) relayError = event.reason;
      });
    }
    return socket;
  } as unknown as typeof WebSocket;
  PatchedSocket.prototype = OriginalSocket.prototype;
  Object.assign(PatchedSocket, {
    CONNECTING: OriginalSocket.CONNECTING,
    OPEN: OriginalSocket.OPEN,
    CLOSING: OriginalSocket.CLOSING,
    CLOSED: OriginalSocket.CLOSED,
  });
  window.WebSocket = PatchedSocket;
}

function chainFor(injected: E2EInjected) {
  return defineChain({
    id: injected.chainId,
    name: "Local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [injected.rpc] } },
  });
}

const memory = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

let cached: Config | undefined;
let cachedKey: string | undefined;

export function createWagmiConfig() {
  const projectId = getWalletConnectProjectId() ?? "";
  const key = readE2E() ? "local" : `testnet:${projectId}`;
  if (process.env.VITEST !== "true" && cached && cachedKey === key) return cached;
  cached = buildWagmiConfig();
  cachedKey = key;
  return cached;
}

function buildWagmiConfig() {
  const e2e = readE2E();
  if (e2e) {
    const chain = chainFor(e2e);
    return createConfig({
      chains: [chain],
      connectors: [e2eConnector(e2e, chain)],
      multiInjectedProviderDiscovery: false,
      ssr: true,
      storage: createStorage({ storage: memoryStorage }),
      transports: { [chain.id]: http(e2e.rpc) },
    });
  }

  const projectId = getWalletConnectProjectId();
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;

  return createConfig({
    chains: [sepolia],
    connectors: projectId
      ? [
          walletConnect({
            projectId,
            showQrModal: false,
            metadata: {
              name: "Subpad",
              description: "Subpad",
              url: origin,
              icons: [],
            },
          }),
        ]
      : [],
    multiInjectedProviderDiscovery: false,
    ssr: true,
    storage: createStorage({ storage: safeCookieStorage }),
    transports: {
      [sepolia.id]: http("https://ethereum-sepolia.publicnode.com"),
    },
  });
}
