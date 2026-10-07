import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { FeePanel } from "./FeePanel";

const api = vi.hoisted(() => ({
  listFees: vi.fn(),
}));

vi.mock("@/lib/fee", async () => {
  const actual = await vi.importActual<typeof import("@/lib/fee")>("@/lib/fee");
  return { ...actual, listFees: api.listFees };
});

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };
const row = {
  id: 1,
  chainid: 1,
  pool_id: "pool-1",
  tx_hash: "0xtx",
  fee_type: "platform",
  fee_token: "0xusdc",
  fee_decimal: 6,
  fee_amount: 100,
  fee_to: "0xfee",
  created_at: "2026-10-07T15:09:00+08:00",
};

beforeEach(() => {
  api.listFees.mockReset();
  api.listFees.mockResolvedValue([]);
});

test("未登录时不查询", () => {
  render(
    <AuthProvider>
      <FeePanel />
    </AuthProvider>,
  );
  expect(screen.getByText("请先登录后再查询 fee。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "查询" })).toBeDisabled();
  expect(api.listFees).not.toHaveBeenCalled();
});

test("登录后展示列表，并按条件查询", async () => {
  api.listFees.mockResolvedValue([row]);
  render(
    <AuthProvider initialUser={user}>
      <FeePanel />
    </AuthProvider>,
  );

  expect(await screen.findByText("平台费")).toBeInTheDocument();
  expect(screen.getByText("0.0001")).toBeInTheDocument();
  expect(screen.getByText("2026-10-07 15:09:00")).toBeInTheDocument();
  expect(api.listFees).toHaveBeenCalledWith({});

  fireEvent.change(screen.getByLabelText("网络"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Pool"), { target: { value: "pool-1" } });
  fireEvent.change(screen.getByLabelText("类型"), { target: { value: "platform" } });
  fireEvent.click(screen.getByRole("button", { name: "查询" }));

  expect(api.listFees).toHaveBeenCalledWith({
    chainid: 1,
    pool_id: "pool-1",
    fee_type: "platform",
  });
});
