import { fireEvent, render, screen } from "@testing-library/react";
import { zeroAddress } from "viem";
import { beforeEach, expect, test, vi } from "vitest";
import { defaultSubpad } from "@/lib/subpad";
import { initPrice, launchSupply, tokenDecimals } from "@/lib/token";
import { AuthProvider } from "./AuthProvider";
import { IssuePanel } from "./IssuePanel";

const api = vi.hoisted(() => ({
  createToken: vi.fn(),
  hostSubpad: vi.fn(),
  getPublicConfig: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  wait: vi.fn(),
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as string | undefined,
  chainId: 31337 as number | undefined,
}));

vi.mock("@/lib/token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/token")>("@/lib/token");
  return { ...actual, createToken: api.createToken };
});

vi.mock("@/lib/config", () => ({
  getPublicConfig: api.getPublicConfig,
}));

vi.mock("@/lib/subpad", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subpad")>("@/lib/subpad");
  return { ...actual, hostSubpad: api.hostSubpad };
});

vi.mock("wagmi", () => ({
  useConnection: () => ({ address: api.address, chainId: api.chainId }),
  usePublicClient: () => ({ readContract: api.read, waitForTransactionReceipt: api.wait }),
  useWriteContract: () => ({ writeContractAsync: api.write }),
}));

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };
const quote = "0x2222222222222222222222222222222222222222";
const fee = "0x1111111111111111111111111111111111111111";
const launch = "0x3333333333333333333333333333333333333333";
const owner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const foods = {
  id: 7,
  userId: 3,
  feeAddr: fee,
  brand: "foods",
  nameFull: "Foods Pad",
  status: 1,
  swapType: "mockSwap",
  description: "食品",
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  api.address = owner;
  api.chainId = 31337;
  api.createToken.mockReset();
  api.hostSubpad.mockReset();
  api.getPublicConfig.mockReset();
  api.write.mockReset();
  api.read.mockReset();
  api.wait.mockReset();
  api.createToken.mockResolvedValue({});
  api.hostSubpad.mockResolvedValue(foods);
  api.getPublicConfig.mockResolvedValue({
    quoteToken: { localUsdc: quote, sepoliaUsdc: "0x4444444444444444444444444444444444444444" },
    syncLog: [{ name: "本地网", chainId: 31337, rpcUrl: "http://127.0.0.1:8545", launchContract: launch }],
  });
  api.write.mockResolvedValue("0xhash");
  api.wait.mockResolvedValue({});
  api.read.mockResolvedValue(owner);
});

test("未登录不能发币", async () => {
  render(
    <AuthProvider>
      <IssuePanel />
    </AuthProvider>,
  );
  expect(screen.getByRole("heading", { name: "subpad 信息" })).toBeInTheDocument();
  expect(screen.getByText("请先登录后再发币。")).toBeInTheDocument();
  expect(await screen.findByLabelText("quoteToken")).toHaveValue(`localUsdc ${quote}`);
  expect(screen.getByLabelText("quoteToken")).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "提交" })).toBeDisabled();
  expect(api.createToken).not.toHaveBeenCalled();
});

test("页面上方展示 subpad 信息，并提交 tokenName 和 tokenSymbol", async () => {
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("Foods Pad")).toBeInTheDocument();
  const info = screen.getByTestId("subpad-info");
  expect(info).toHaveTextContent("品牌");
  expect(info).toHaveTextContent("foods");
  expect(info).toHaveTextContent("padId");
  expect(info).toHaveTextContent("有效");
  expect(info).toHaveTextContent("模拟");
  expect(info).toHaveTextContent("食品");
  expect(api.hostSubpad).toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("tokenName"), { target: { value: "Foods" } });
  fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("已提交")).toBeInTheDocument();
  expect(api.createToken).toHaveBeenCalledWith({
    subpadId: 7,
    tokenName: "Foods",
    tokenSymbol: "FOOD",
    chainId: 31337,
  });
  expect(api.write).toHaveBeenCalledWith(
    expect.objectContaining({
      address: launch,
      functionName: "createToken",
      args: [
        {
          useMockSwap: true,
          tokenName: "Foods",
          tokenSymbol: "FOOD",
          tokenDecimals,
          totalSupply: launchSupply,
          quoteToken: quote,
          initPrice,
          subpadId: 7n,
          subpadFeeTo: fee,
        },
      ],
    }),
  );
  expect(api.createToken.mock.invocationCallOrder[0]).toBeLessThan(api.write.mock.invocationCallOrder[0]);
  const log = screen.getByLabelText("交易与回执") as HTMLTextAreaElement;
  expect(log.value).toContain('"type": "交易"');
  expect(log.value).toContain("createToken");
  expect(log.value).toContain("0xhash");
  expect(log.value).toContain('"type": "回执"');
  expect(log.value).toContain(launchSupply.toString());
});

test("发币失败时文本框留下调用和错误", async () => {
  api.write.mockRejectedValue(Object.assign(new Error("execution reverted"), { shortMessage: "owner mismatch" }));
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel />
    </AuthProvider>,
  );
  fireEvent.change(await screen.findByLabelText("tokenName"), { target: { value: "Foods" } });
  fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("execution reverted")).toBeInTheDocument();
  const log = screen.getByLabelText("交易与回执") as HTMLTextAreaElement;
  expect(log.value).toContain('"type": "错误"');
  expect(log.value).toContain("createToken");
  expect(log.value).toContain("owner mismatch");
  expect(log.value.match(/"type": "错误"/g)).toHaveLength(1);
});

test("没有 X-Subpad-Info 时按默认 pad 发币，padId 为 0", async () => {
  api.hostSubpad.mockResolvedValue(defaultSubpad());
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("默认 pad")).toBeInTheDocument();
  expect(screen.getByTestId("subpad-info")).not.toHaveTextContent("padId");

  fireEvent.change(screen.getByLabelText("tokenName"), { target: { value: "Foods" } });
  fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("已提交")).toBeInTheDocument();
  expect(api.createToken).toHaveBeenCalledWith({
    subpadId: 0,
    tokenName: "Foods",
    tokenSymbol: "FOOD",
    chainId: 31337,
  });
  expect(api.write.mock.calls[0][0].args[0]).toMatchObject({
    subpadId: 0n,
    subpadFeeTo: zeroAddress,
    useMockSwap: true,
  });
});
