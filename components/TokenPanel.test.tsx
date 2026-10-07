import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { TokenPanel } from "./TokenPanel";

const api = vi.hoisted(() => ({
  listTokens: vi.fn(),
}));

vi.mock("@/lib/token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/token")>("@/lib/token");
  return { ...actual, listTokens: api.listTokens };
});

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };
const row = {
  id: 1,
  userId: 3,
  subpadId: null,
  poolId: "pool-1",
  creator: "0xcreator",
  chainId: 31337,
  tokenAddr: "0xtoken",
  tokenName: "Foods",
  tokenSymbol: "FOOD",
  quoteTokenAddr: "0xusdc",
  quoteTokenSymbol: "USDC",
  launchSupply: 1000,
  tickSpacing: 60,
};

beforeEach(() => {
  api.listTokens.mockReset();
  api.listTokens.mockResolvedValue([]);
});

test("未登录时不查询", () => {
  render(
    <AuthProvider>
      <TokenPanel />
    </AuthProvider>,
  );
  expect(screen.getByText("请先登录后再查询 token。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "查询" })).toBeDisabled();
  expect(api.listTokens).not.toHaveBeenCalled();
});

test("登录后展示列表，并按条件查询", async () => {
  api.listTokens.mockResolvedValue([row]);
  render(
    <AuthProvider initialUser={user}>
      <TokenPanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("Foods")).toBeInTheDocument();
  expect(screen.getByText("FOOD")).toBeInTheDocument();
  const trade = within(screen.getByRole("row", { name: /Foods/ })).getByRole("link", { name: "交易" });
  expect(trade).toHaveAttribute("href", "/swap/1");
  expect(trade).toHaveAttribute("target", "_blank");
  expect(trade).toHaveClass("primary-button");
  const detail = within(screen.getByRole("row", { name: /Foods/ })).getByRole("cell", { name: /合约/ });
  expect(detail).toHaveTextContent("0xtoken");
  expect(detail).toHaveTextContent("USDC");
  expect(detail).toHaveTextContent("pool-1");
  expect(detail).toHaveTextContent("0xcreator");
  const headers = screen.getAllByRole("columnheader").map((item) => item.textContent);
  expect(headers[headers.indexOf("padId") - 1]).toBe("userId");
  const cells = within(screen.getByRole("row", { name: /Foods/ })).getAllByRole("cell");
  expect(cells[headers.indexOf("userId")]).toHaveTextContent("3");
  expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
  expect(api.listTokens).toHaveBeenCalledWith({});

  fireEvent.change(screen.getByLabelText("符号"), { target: { value: "FOOD" } });
  fireEvent.change(screen.getByLabelText("网络"), { target: { value: "31337" } });
  fireEvent.change(screen.getByLabelText("padId"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "看我的token" }));
  fireEvent.click(screen.getByRole("button", { name: "查询" }));

  expect(api.listTokens).toHaveBeenCalledWith({
    tokenSymbol: "FOOD",
    chainId: 31337,
    subpadId: 2,
    userId: 3,
  });
});

test("网络和 padId 必须是数字", () => {
  render(
    <AuthProvider initialUser={user}>
      <TokenPanel />
    </AuthProvider>,
  );
  fireEvent.change(screen.getByLabelText("网络"), { target: { value: "abc" } });
  fireEvent.click(screen.getByRole("button", { name: "查询" }));
  expect(screen.getByText("网络请填写数字")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("网络"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("padId"), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: "查询" }));
  expect(screen.getByText("padId 请填写数字")).toBeInTheDocument();
});
