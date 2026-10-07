import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { SubpadPanel } from "./SubpadPanel";

const api = vi.hoisted(() => ({
  listSubpads: vi.fn(),
  createSubpad: vi.fn(),
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
  expect(screen.getByTestId("default-pad")).toHaveTextContent("默认 pad");
  expect(screen.getByTestId("default-pad")).not.toHaveTextContent("padId");
  expect(screen.getByRole("button", { name: "新建 subpad" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "查询" })).toBeDisabled();
  expect(api.listSubpads).not.toHaveBeenCalled();
});

test("展示当前用户的 subpad，并可以新建", async () => {
  api.listSubpads.mockResolvedValue([
    {
      id: 1,
      userId: 3,
      feeAddr: "0xfee",
      brand: "foods",
      nameFull: "Foods Pad",
      status: 1,
      swapType: "mockSwap",
      description: "",
      createdAt: "",
      updatedAt: "",
    },
  ]);
  api.createSubpad.mockResolvedValue({
    id: 2,
    userId: 3,
    feeAddr: "0xfee",
    brand: "drinks",
    nameFull: "Drinks Pad",
    status: 1,
    swapType: "uniSwap",
    description: "饮料",
    createdAt: "",
    updatedAt: "",
  });
  render(
    <AuthProvider initialUser={user}>
      <SubpadPanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("Foods Pad")).toBeInTheDocument();
  const headers = screen.getAllByRole("columnheader").map((item) => item.textContent);
  expect(headers[0]).toBe("品牌");
  expect(headers.at(-1)).toBe("操作");
  const row = screen.getByRole("row", { name: /Foods Pad/ });
  expect(within(row).getAllByRole("cell")[0]).toHaveTextContent("foods");
  expect(within(row).getByRole("link", { name: "发币" })).toHaveAttribute("href", "/subpad/issue/1");
  expect(within(row).getByRole("button", { name: "交易" })).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "费用" })).toBeInTheDocument();
  expect(screen.getByTestId("default-pad")).not.toHaveTextContent("padId");
  expect(within(screen.getByTestId("default-pad")).getByRole("link", { name: "发币" })).toHaveAttribute(
    "href",
    "/subpad/issue",
  );
  expect(api.listSubpads).toHaveBeenCalledWith({});

  fireEvent.click(screen.getByRole("checkbox", { name: "看我的subpad" }));
  fireEvent.change(screen.getAllByLabelText("品牌")[0], { target: { value: "foods" } });
  fireEvent.click(screen.getByRole("button", { name: "查询" }));
  expect(api.listSubpads).toHaveBeenCalledWith({ userId: 3, brand: "foods" });

  fireEvent.click(screen.getByRole("button", { name: "新建 subpad" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("品牌"), { target: { value: "drinks" } });
  fireEvent.change(within(dialog).getByLabelText("全称"), { target: { value: "Drinks Pad" } });
  fireEvent.change(within(dialog).getByLabelText("描述"), { target: { value: "饮料" } });
  fireEvent.change(within(dialog).getByLabelText("Swap 类型"), { target: { value: "uniSwap" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "提交" }));

  expect(await screen.findByText("Drinks Pad")).toBeInTheDocument();
  expect(api.createSubpad).toHaveBeenCalledWith({
    userId: 3,
    brand: "drinks",
    nameFull: "Drinks Pad",
    status: 1,
    swapType: "uniSwap",
    description: "饮料",
  });
});
