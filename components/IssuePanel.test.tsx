import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { IssuePanel } from "./IssuePanel";

const api = vi.hoisted(() => ({
  createToken: vi.fn(),
  getSubpad: vi.fn(),
  listSubpads: vi.fn(),
  getPublicConfig: vi.fn(),
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
  return { ...actual, getSubpad: api.getSubpad, listSubpads: api.listSubpads };
});

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };
const foods = {
  id: 1,
  userId: 3,
  feeAddr: "0xfee",
  brand: "foods",
  nameFull: "Foods Pad",
  status: 1,
  swapType: "mockSwap",
  description: "食品",
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  api.createToken.mockReset();
  api.getSubpad.mockReset();
  api.listSubpads.mockReset();
  api.createToken.mockResolvedValue({});
  api.getSubpad.mockResolvedValue(foods);
  api.listSubpads.mockResolvedValue([foods]);
  api.getPublicConfig.mockResolvedValue({
    quoteToken: { localUsdc: "0xlocal", sepoliaUsdc: "0xsep" },
    syncLog: [],
  });
});

test("未登录不能发币", async () => {
  render(
    <AuthProvider>
      <IssuePanel subpadId="1" />
    </AuthProvider>,
  );
  expect(screen.getByRole("heading", { name: "subpad 信息" })).toBeInTheDocument();
  expect(screen.getByText("请先登录后再发币。")).toBeInTheDocument();
  expect(await screen.findByLabelText("quoteToken")).toHaveValue("localUsdc 0xlocal");
  expect(screen.getByLabelText("quoteToken")).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "提交" })).toBeDisabled();
  expect(api.createToken).not.toHaveBeenCalled();
  expect(api.getSubpad).not.toHaveBeenCalled();
});

test("页面上方展示 subpad 信息，并提交 tokenName 和 tokenSymbol", async () => {
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel subpadId="7" />
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
  expect(api.getSubpad).toHaveBeenCalledWith(7);

  fireEvent.change(screen.getByLabelText("tokenName"), { target: { value: "Foods" } });
  fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("已提交")).toBeInTheDocument();
  expect(api.createToken).toHaveBeenCalledWith({
    subpadId: 7,
    tokenName: "Foods",
    tokenSymbol: "FOOD",
  });
});

test("默认 pad 按域名展示 subpad，发币不带 padId", async () => {
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location,
    host: "foods.launch.o1.local",
  });
  try {
    render(
      <AuthProvider initialUser={user}>
        <IssuePanel />
      </AuthProvider>,
    );

    expect(await screen.findByText("Foods Pad")).toBeInTheDocument();
    expect(screen.getByTestId("subpad-info")).not.toHaveTextContent("padId");
    expect(api.listSubpads).toHaveBeenCalledWith({ brand: "foods" });
    expect(api.getSubpad).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("tokenName"), { target: { value: "Foods" } });
    fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(await screen.findByText("已提交")).toBeInTheDocument();
    expect(api.createToken).toHaveBeenCalledWith({
      tokenName: "Foods",
      tokenSymbol: "FOOD",
    });
  } finally {
    vi.restoreAllMocks();
  }
});
