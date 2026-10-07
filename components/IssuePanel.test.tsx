import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { IssuePanel } from "./IssuePanel";

const api = vi.hoisted(() => ({
  createToken: vi.fn(),
}));

vi.mock("@/lib/token", () => ({
  createToken: api.createToken,
}));

const user = { id: 3, username: "alice", fee_addr: "", token: "token" };

beforeEach(() => {
  api.createToken.mockReset();
  api.createToken.mockResolvedValue({});
});

test("未登录不能发币", () => {
  render(
    <AuthProvider>
      <IssuePanel subpadId="1" />
    </AuthProvider>,
  );
  expect(screen.getByText("请先登录后再发币。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "提交" })).toBeDisabled();
  expect(api.createToken).not.toHaveBeenCalled();
});

test("提交 tokenName 和 tokenSymbol", async () => {
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel subpadId="7" />
    </AuthProvider>,
  );

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

test("默认 pad 发币不带 padId", async () => {
  render(
    <AuthProvider initialUser={user}>
      <IssuePanel />
    </AuthProvider>,
  );

  fireEvent.change(screen.getByLabelText("tokenName"), { target: { value: "Foods" } });
  fireEvent.change(screen.getByLabelText("tokenSymbol"), { target: { value: "FOOD" } });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(await screen.findByText("已提交")).toBeInTheDocument();
  expect(api.createToken).toHaveBeenCalledWith({
    tokenName: "Foods",
    tokenSymbol: "FOOD",
  });
  expect(screen.queryByText(/padId/)).not.toBeInTheDocument();
});
