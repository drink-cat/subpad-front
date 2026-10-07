export function TxLog({ value }: { value: string }) {
  return (
    <label className="field tx-log">
      交易与回执
      <textarea readOnly value={value} placeholder="提交后在这里查看交易和回执" spellCheck={false} />
    </label>
  );
}
