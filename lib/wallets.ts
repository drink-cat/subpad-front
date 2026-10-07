export type WalletId = "metamask" | "trust";

export type WalletOption = {
  id: WalletId;
  name: string;
  hint: string;
};

export const WALLETS: WalletOption[] = [
  { id: "metamask", name: "MetaMask", hint: "用 MetaMask App 扫描" },
  { id: "trust", name: "Trust Wallet", hint: "用 Trust Wallet 扫描" },
];

export const RECOGNIZED_WALLET_KEY = "recognized-wallet";
