import { expect, test } from "vitest";
import { claimUnits, isLocalUsdc, launchAddress, parseSwapAmount, swapAmounts, toPoolId } from "./swap";

const config = {
  quoteToken: { localUsdc: "0xlocal", sepoliaUsdc: "0xsep" },
  syncLog: [
    {
      name: "本地网",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      launchContract: "0x3333333333333333333333333333333333333333",
    },
  ],
};

test("买卖数量二选一，卖出为负数", () => {
  expect(swapAmounts("buy", "token", BigInt(5))).toEqual({ tokenAmount: BigInt(5), quoteTokenAmount: BigInt(0) });
  expect(swapAmounts("sell", "token", BigInt(5))).toEqual({ tokenAmount: BigInt(-5), quoteTokenAmount: BigInt(0) });
  expect(swapAmounts("buy", "quote", BigInt(8))).toEqual({ tokenAmount: BigInt(0), quoteTokenAmount: BigInt(8) });
  expect(swapAmounts("sell", "quote", BigInt(8))).toEqual({ tokenAmount: BigInt(0), quoteTokenAmount: BigInt(-8) });
});

test("数量按小数位换算，领取固定 1000", () => {
  expect(parseSwapAmount("1.5", 6)).toBe(BigInt(1500000));
  expect(() => parseSwapAmount("0", 6)).toThrow("数量请填写大于 0 的数字");
  expect(claimUnits(6)).toBe(BigInt("1000000000"));
});

test("localUsdc 按地址识别，poolId 补成 32 字节", () => {
  expect(isLocalUsdc("0xAbC", "0xabc")).toBe(true);
  expect(isLocalUsdc("0xsep", "0xabc")).toBe(false);
  expect(toPoolId("01")).toBe(`0x${"0".repeat(62)}01`);
  expect(launchAddress(config, 31337)).toBe("0x3333333333333333333333333333333333333333");
  expect(() => launchAddress(config, 1)).toThrow("未配置发币合约");
});
