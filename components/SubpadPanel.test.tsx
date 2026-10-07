import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { SubpadPanel } from "./SubpadPanel";

const api = vi.hoisted(() => ({
  listSubpads: vi.fn(),
  createSubpad: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useConnection: () => ({ address: "0xwallet" }),
}));

vi.mock("@/lib/subpad", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subpad")>("@/lib/subpad");
  return { ...actual, listSubpads: api.listSubpads, createSubpad: api.createSubpad };
});

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };

beforeEach(() => {
  api.listSubpads.mockReset();
  api.createSubpad.mockReset();
  api.listSubpads.mockResolvedValue([]);
});

test("未登录时提示先登录", () => {
  render(
    <AuthProvider>
      <SubpadPanel />
    </AuthProvider>,
  );
  expect(screen.getByText("请先登录后再管理 subpad。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "新建 subpad" })).toBeDisabled();
  expect(api.listSubpads).not.toHaveBeenCalled();
});

test("展示当前用户的 subpad，并可以新建", async () => {
  api.listSubpads.mockResolvedValue([
    {
      id: 1,
      user_id: 3,
      user_addr: "0xwallet",
      brand: "foods",
      name_full: "Foods Pad",
      status: 1,
      swap_type: "mockSwap",
      description: "",
    },
  ]);
  api.createSubpad.mockResolvedValue({
    id: 2,
    user_id: 3,
    user_addr: "0xwallet",
    brand: "drinks",
    name_full: "Drinks Pad",
    status: 1,
    swap_type: "uniSwap",
    description: "饮料",
  });
  render(
    <AuthProvider initialUser={user}>
      <SubpadPanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("Foods Pad")).toBeInTheDocument();
  expect(screen.getByText("模拟")).toBeInTheDocument();
  expect(api.listSubpads).toHaveBeenCalledWith(3);

  fireEvent.click(screen.getByRole("button", { name: "新建 subpad" }));
  fireEvent.change(screen.getByLabelText("品牌"), { target: { value: "drinks" } });
  fireEvent.change(screen.getByLabelText("全称"), { target: { value: "Drinks Pad" } });
  fireEvent.change(screen.getByLabelText("描述"), { target: { value: "饮料" } });
  fireEvent.change(screen.getByLabelText("Swap 类型"), { target: { value: "uniSwap" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("Drinks Pad")).toBeInTheDocument();
  expect(api.createSubpad).toHaveBeenCalledWith({
    user_id: 3,
    user_addr: "0xwallet",
    brand: "drinks",
    name_full: "Drinks Pad",
    status: 1,
    swap_type: "uniSwap",
    description: "饮料",
  });
});
