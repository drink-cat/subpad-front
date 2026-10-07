import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";
import { AuthProvider } from "./AuthProvider";

const api = vi.hoisted(() => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/user", () => api);

beforeEach(() => {
  api.loginUser.mockReset();
  api.registerUser.mockReset();
  api.updateUser.mockReset();
  document.cookie = "subpad_user=; Path=/; Max-Age=0";
});

function renderPanel() {
  render(
    <AuthProvider>
      <AccountPanel />
    </AuthProvider>,
  );
}

test("登录成功后可以修改用户名", async () => {
  api.loginUser.mockResolvedValue({ id: 3, username: "alice", fee_addr: "", token: "token" });
  api.updateUser.mockResolvedValue({ id: 3, username: "amy", feeAddr: "0xabc" });
  renderPanel();

  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "alice" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByRole("heading", { name: "修改信息" })).toBeInTheDocument();
  expect(api.loginUser).toHaveBeenCalledWith("alice", "secret");

  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "amy" } });
  fireEvent.change(screen.getByLabelText("手续费地址"), { target: { value: "0xabc" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));

  expect(await screen.findByDisplayValue("amy")).toBeInTheDocument();
  expect(api.updateUser).toHaveBeenCalledWith(3, { username: "amy", password: "", feeAddr: "0xabc" });
});

test("用户不存在时显示错误", async () => {
  api.loginUser.mockRejectedValue(new Error("用户名或密码错误"));
  renderPanel();

  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "missing" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
});

test("注册成功后进入修改信息", async () => {
  api.registerUser.mockResolvedValue({ id: 4, username: "bob", fee_addr: "0xfee", token: "token" });
  renderPanel();

  fireEvent.click(screen.getByRole("tab", { name: "注册" }));
  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "bob" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret" } });
  fireEvent.change(screen.getByLabelText("手续费地址"), { target: { value: "0xfee" } });
  fireEvent.click(screen.getByRole("button", { name: "注册" }));

  expect(await screen.findByRole("heading", { name: "修改信息" })).toBeInTheDocument();
  expect(api.registerUser).toHaveBeenCalledWith({
    username: "bob",
    password: "secret",
    feeAddr: "0xfee",
  });
});
