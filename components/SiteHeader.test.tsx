import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Providers } from "./Providers";
import { SiteHeader } from "./SiteHeader";

const behavior = vi.hoisted(() => ({
  mode: "success" as "success" | "reject" | "error" | "uri",
}));

vi.mock("wagmi/connectors/walletConnect", async () => {
  const { createConnector } = await import("wagmi");
  const { sepolia } = await import("wagmi/chains");
  const account = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

  return {
    walletConnect: () =>
      createConnector((config) => ({
        id: "walletConnect",
        name: "WalletConnect",
        type: "walletConnect",
        async connect() {
          if (behavior.mode === "error") throw new Error("relay down");
          if (behavior.mode === "reject") throw new Error("User rejected the request");
          if (behavior.mode === "uri") {
            config.emitter.emit("message", { type: "display_uri", data: "wc:test-uri" });
            return new Promise(() => {}) as never;
          }
          return { accounts: [account], chainId: sepolia.id } as never;
        },
        async disconnect() {},
        async getAccounts() {
          return [] as const;
        },
        async getChainId() {
          return sepolia.id;
        },
        async getProvider() {
          return undefined;
        },
        async isAuthorized() {
          return false;
        },
        onAccountsChanged() {},
        onChainChanged() {},
        onDisconnect() {},
      })),
  };
});

afterEach(() => {
  behavior.mode = "success";
  vi.unstubAllEnvs();
  localStorage.clear();
});

function renderHeader() {
  render(
    <Providers>
      <SiteHeader />
    </Providers>,
  );
}

async function settleReconnect() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("本地模式连接 E2E 后显示 Anvil 默认账户", async () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "local");
  renderHeader();

  fireEvent.click(screen.getByTestId("connect-wallet"));
  fireEvent.click(screen.getByTestId("connect-e2e"));

  expect(await screen.findByTestId("wallet-address")).toHaveTextContent("0xf39F…2266");
  expect(screen.queryByRole("button", { name: "MetaMask" })).not.toBeInTheDocument();
});

test("测试网未配置 Project ID 时提示缺少 Project ID", () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "");
  renderHeader();

  fireEvent.click(screen.getByTestId("connect-wallet"));

  expect(screen.getByText("缺少 Project ID")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /MetaMask/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Trust Wallet/ })).not.toBeInTheDocument();
});

test("测试网钱包列表只有 MetaMask 和 Trust Wallet", () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
  renderHeader();

  fireEvent.click(screen.getByTestId("connect-wallet"));

  expect(screen.getByRole("menuitem", { name: /MetaMask/ })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Trust Wallet/ })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: /OKX/ })).not.toBeInTheDocument();
  expect(screen.queryByText("缺少 Project ID")).not.toBeInTheDocument();
});

test("测试网点击钱包后弹出二维码", async () => {
  behavior.mode = "uri";
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
  renderHeader();
  await settleReconnect();

  fireEvent.click(screen.getByTestId("connect-wallet"));
  fireEvent.click(screen.getByTestId("wallet-option-metamask"));

  expect(await screen.findByTestId("qr-dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "MetaMask" })).toBeInTheDocument();
  expect(await screen.findByAltText("钱包连接二维码")).toBeInTheDocument();
});

test("测试网连接失败时在二维码弹层显示原因", async () => {
  behavior.mode = "error";
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
  renderHeader();
  await settleReconnect();

  fireEvent.click(screen.getByTestId("connect-wallet"));
  fireEvent.click(screen.getByTestId("wallet-option-metamask"));

  expect(await screen.findByRole("alert")).toHaveTextContent("relay down");
  expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
});

test("测试网拒绝连接后仍显示连接钱包", async () => {
  behavior.mode = "reject";
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
  renderHeader();
  await settleReconnect();

  fireEvent.click(screen.getByTestId("connect-wallet"));
  fireEvent.click(screen.getByTestId("wallet-option-trust"));

  await waitFor(() => {
    expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument();
  });
  expect(screen.getByTestId("connect-wallet")).toHaveTextContent("连接钱包");
});

test("测试网连接成功后可以断开", async () => {
  vi.stubEnv("NEXT_PUBLIC_CHAIN_ENV", "testnet");
  vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
  renderHeader();
  await settleReconnect();

  fireEvent.click(screen.getByTestId("connect-wallet"));
  fireEvent.click(screen.getByTestId("wallet-option-trust"));

  const accountButton = await screen.findByTestId("wallet-address");
  expect(accountButton).toHaveTextContent("0x7099…79C8");
  fireEvent.click(accountButton);
  fireEvent.click(screen.getByRole("button", { name: "断开连接" }));

  expect(await screen.findByTestId("connect-wallet")).toHaveTextContent("连接钱包");
});
