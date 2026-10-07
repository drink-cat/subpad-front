export class ChainLogError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "请求失败");
    this.name = "ChainLogError";
    this.cause = cause;
  }
}

export function describeError(error: unknown, seen = new WeakSet<object>()): unknown {
  if (!(error instanceof Error)) return error;
  if (seen.has(error)) return { message: error.message };
  seen.add(error);
  const extra = error as Error & { shortMessage?: string; details?: string; reason?: string; cause?: unknown };
  const out: Record<string, unknown> = { name: error.name, message: error.message };
  if (extra.shortMessage) out.shortMessage = extra.shortMessage;
  if (extra.details) out.details = extra.details;
  if (extra.reason) out.reason = extra.reason;
  if (extra.cause !== undefined) out.cause = describeError(extra.cause, seen);
  return out;
}

function readableReceipt(receipt: unknown) {
  if (!receipt || typeof receipt !== "object" || !("logsBloom" in receipt)) return receipt;
  const copy = { ...(receipt as Record<string, unknown>) };
  delete copy.logsBloom;
  return copy;
}

export function formatTxEntry(entry: unknown) {
  return JSON.stringify(entry, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
}

export function appendTxLog(current: string, entry: unknown) {
  const next = formatTxEntry(entry);
  return current ? `${current}\n\n${next}` : next;
}

export async function traceContractWrite(
  push: (entry: unknown) => void,
  call: { address: string; functionName: string; args: readonly unknown[] },
  write: () => Promise<`0x${string}`>,
  wait: (hash: `0x${string}`) => Promise<unknown>,
) {
  let hash: `0x${string}` | undefined;
  try {
    hash = await write();
    push({ type: "交易", hash, address: call.address, functionName: call.functionName, args: call.args });
    const receipt = await wait(hash);
    push({ type: "回执", hash, receipt: readableReceipt(receipt) });
  } catch (error) {
    push({
      type: "错误",
      hash,
      address: call.address,
      functionName: call.functionName,
      args: call.args,
      error: describeError(error),
    });
    throw new ChainLogError(error);
  }
}
