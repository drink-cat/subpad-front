import { expect, test } from "vitest";
import { appendTxLog, describeError } from "./txLog";

test("交易日志把 bigint 写成十进制字符串", () => {
  const text = appendTxLog("", { type: "交易", args: [BigInt(1)] });
  expect(text).toContain('"type": "交易"');
  expect(text).toContain('"1"');
  expect(appendTxLog(text, { type: "回执", status: "success" })).toContain('"type": "回执"');
});

test("错误保留 revert 原因", () => {
  const error = new Error("execution reverted");
  Object.assign(error, { shortMessage: "User rejected", details: "0x1234" });
  expect(describeError(error)).toMatchObject({
    name: "Error",
    message: "execution reverted",
    shortMessage: "User rejected",
    details: "0x1234",
  });
});
