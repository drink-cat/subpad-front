import { fireEvent, render, screen } from "@testing-library/react";
import { maxUint256 } from "viem";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { SwapPanel } from "./SwapPanel";

const api = vi.hoisted(() => ({
  getToken: vi.fn(),
  hostSubpad: vi.fn(),
  getPublicConfig: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  wait: vi.fn(),
  address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as string | undefined,
}));

vi.mock("@/lib/token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/token")>("@/lib/token");
  return { ...actual, getToken: api.getToken };
});

vi.mock("@/lib/subpad", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subpad")>("@/lib/subpad");
  return { ...actual, hostSubpad: api.hostSubpad };
});

vi.mock("@/lib/config", () => ({
  getPublicConfig: api.getPublicConfig,
}));

vi.mock("wagmi", () => ({
  useConnection: () => ({ address: api.address }),
  usePublicClient: () => ({ readContract: api.read, waitForTransactionReceipt: api.wait }),
  useWriteContract: () => ({ writeContractAsync: api.write }),
}));

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };
const quote = "0x2222222222222222222222222222222222222222";
const project = "0x1111111111111111111111111111111111111111";
const launch = "0x3333333333333333333333333333333333333333";
const token = {
  id: 9,
  userId: 3,
  subpadId: 7,
  poolId: "01",
  creator: "0xcreator",
  chainId: 31337,
  tokenAddr: project,
  tokenName: "Foods",
  tokenSymbol: "FOOD",
  quoteTokenAddr: quote,
  quoteTokenSymbol: "USDC",
  launchSupply: 1000,
  tickSpacing: 0,
};
const pad = {
  id: 7,
  userId: 3,
  feeAddr: "0xfee",
  brand: "foods",
  nameFull: "Foods Pad",
  status: 1,
  swapType: "mockSwap",
  description: "",
  createdAt: "",
  updatedAt: "",
};

function config(local = quote) {
  return {
    quoteToken: { localUsdc: local, sepoliaUsdc: "0x4444444444444444444444444444444444444444" },
    syncLog: [{ name: "本地网", chainId: 31337, rpcUrl: "http://127.0.0.1:8545", launchContract: launch }],
  };
}

beforeEach(() => {
  api.address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  api.getToken.mockReset();
  api.hostSubpad.mockReset();
  api.getPublicConfig.mockReset();
  api.write.mockReset();
  api.read.mockReset();
  api.wait.mockReset();
  api.getToken.mockResolvedValue(token);
  api.hostSubpad.mockResolvedValue(pad);
  api.getPublicConfig.mockResolvedValue(config());
  api.write.mockResolvedValue("0xhash");
  api.wait.mockResolvedValue({});
  api.read.mockImplementation(async ({ address }: { address: string }) => (address === project ? 18 : 6));
});

test("token id 无效", () => {
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="0" />
    </AuthProvider>,
  );
  expect(screen.getByText("token 不存在。")).toBeInTheDocument();
  expect(api.getToken).not.toHaveBeenCalled();
});

test("未登录不能交易", () => {
  render(
    <AuthProvider>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  expect(screen.getByText("请先登录后再交易。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "交易" })).toBeDisabled();
  expect(api.getToken).not.toHaveBeenCalled();
});

test("展示 subpad 和 token，localUsdc 可以领取", async () => {
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  expect(await screen.findByText("Foods Pad")).toBeInTheDocument();
  expect(screen.getByTestId("token-info")).toHaveTextContent("FOOD");
  expect(screen.getByTestId("subpad-info")).toHaveTextContent("padId");
  expect(screen.getByRole("button", { name: "领取本地usdc" })).toBeEnabled();
});

test("报价币不是 localUsdc 时不显示领取", async () => {
  api.getPublicConfig.mockResolvedValue(config("0x5555555555555555555555555555555555555555"));
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  expect(await screen.findByText("Foods")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "领取本地usdc" })).not.toBeInTheDocument();
});

test("买入按代币数量授权报价币并提交", async () => {
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  expect(await screen.findByText("Foods")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("数量"), { target: { value: "1.5" } });
  fireEvent.click(screen.getByRole("button", { name: "交易" }));

  await screen.findByText("已提交");
  expect(api.write).toHaveBeenCalledTimes(2);
  expect(api.write.mock.calls[0][0]).toMatchObject({
    address: quote,
    functionName: "approve",
    args: [launch, maxUint256],
  });
  const log = screen.getByLabelText("交易与回执") as HTMLTextAreaElement;
  expect(log.value).toContain("approve");
  expect(log.value).toContain("mockSwap");
  expect(log.value).toContain("0xhash");
  expect(log.value.match(/"type": "回执"/g)).toHaveLength(2);
  expect(api.write.mock.calls[1][0]).toMatchObject({
    address: launch,
    functionName: "mockSwap",
    args: [
      {
        poolId: `0x${"0".repeat(62)}01`,
        tokenAmount: BigInt("1500000000000000000"),
        quoteTokenAmount: BigInt(0),
      },
    ],
  });
});

test("卖出按报价币数量时两个币都授权", async () => {
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  expect(await screen.findByText("Foods")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "卖" }));
  fireEvent.click(screen.getByRole("radio", { name: "报价币数量" }));
  fireEvent.change(screen.getByLabelText("数量"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "交易" }));

  await screen.findByText("已提交");
  expect(api.write.mock.calls.map((call) => call[0].functionName)).toEqual(["approve", "approve", "mockSwap"]);
  expect(api.write.mock.calls[0][0].address).toBe(project);
  expect(api.write.mock.calls[1][0].address).toBe(quote);
  expect(api.write.mock.calls[2][0].args[0]).toMatchObject({ tokenAmount: BigInt(0), quoteTokenAmount: BigInt(-2000000) });
});

test("领取本地 usdc 给自己铸 1000", async () => {
  render(
    <AuthProvider initialUser={user}>
      <SwapPanel tokenId="9" />
    </AuthProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "领取本地usdc" }));
  expect(await screen.findByText("已领取 1000")).toBeInTheDocument();
  expect(api.write).toHaveBeenCalledWith(
    expect.objectContaining({
      address: quote,
      functionName: "mintSelfFree",
      args: [BigInt("1000000000")],
    }),
  );
  const log = screen.getByLabelText("交易与回执") as HTMLTextAreaElement;
  expect(log.value).toContain("mintSelfFree");
  expect(log.value).toContain('"type": "回执"');
});
