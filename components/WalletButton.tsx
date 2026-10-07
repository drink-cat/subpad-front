"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import { QrCode } from "@/components/QrCode";
import { WalletMark } from "@/components/WalletMark";
import { shortAddress } from "@/lib/address";
import { isLocalEnv } from "@/lib/e2e";
import { getWalletConnectProjectId } from "@/lib/env";
import { getWalletRelayError } from "@/lib/wagmi";
import { RECOGNIZED_WALLET_KEY, WALLETS, type WalletOption } from "@/lib/wallets";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isUserCancel(error: unknown) {
  return /reject|denied|closed|reset|cancel|user disapproved/i.test(errorText(error));
}

function explainConnectError(error: unknown) {
  const message = errorText(error);
  const host = window.location.host;
  if (/subscribe|interrupted|origin|unauthorized|project id|allowed/i.test(message)) {
    return `钱包中继拒绝了 ${host}。这个域名不在当前 Project ID 的允许列表里，所以二维码出不来。请在 Reown Cloud 允许 ${host}，并把 Project ID 写到 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID。`;
  }
  return message || "连接失败，请重试。";
}

export function WalletButton() {
  const { address, chain, isConnected } = useConnection();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const connector = connectors.find((item) => item.id === "walletConnect");
  const e2eConnector = connectors.find((item) => item.id === "e2e");
  const local = isLocalEnv();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWallet, setActiveWallet] = useState<WalletOption | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecognized(window.localStorage.getItem(RECOGNIZED_WALLET_KEY));
  }, [isConnected]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeQr = useCallback(() => {
    cancelled.current = true;
    setActiveWallet(null);
    setUri(null);
    setError(null);
    void connector?.disconnect().catch(() => undefined);
  }, [connector]);

  useEffect(() => {
    if (!activeWallet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeQr();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeWallet, closeQr]);

  const chooseWallet = useCallback(
    async (wallet: WalletOption) => {
      if (!connector) {
        setActiveWallet(wallet);
        setError("当前环境没有可用的钱包连接器。");
        return;
      }

      cancelled.current = false;
      setMenuOpen(false);
      setActiveWallet(wallet);
      setUri(null);
      setError(null);

      const onMessage = (message: { type: string; data?: unknown }) => {
        if (message.type === "display_uri" && typeof message.data === "string") {
          setUri(message.data);
        }
      };

      const onRejection = (event: PromiseRejectionEvent) => {
        if (cancelled.current) return;
        if (!/subscribe|interrupted|origin|unauthorized/i.test(errorText(event.reason))) return;
        event.preventDefault();
        setUri(null);
        setError(explainConnectError(event.reason));
      };
      const watchRelay = window.setInterval(() => {
        const reason = getWalletRelayError();
        if (!reason || cancelled.current) return;
        setUri(null);
        setError(explainConnectError(reason));
        window.clearInterval(watchRelay);
      }, 300);

      connector.emitter.on("message", onMessage);
      window.addEventListener("unhandledrejection", onRejection);
      try {
        await connectAsync({ connector });
        if (cancelled.current) return;
        window.localStorage.setItem(RECOGNIZED_WALLET_KEY, wallet.name);
        setRecognized(wallet.name);
        setActiveWallet(null);
        setUri(null);
      } catch (caught) {
        if (cancelled.current || isUserCancel(caught)) {
          if (!cancelled.current) {
            setActiveWallet(null);
            setUri(null);
          }
          return;
        }
        setUri(null);
        setError(explainConnectError(caught));
      } finally {
        window.clearInterval(watchRelay);
        connector.emitter.off("message", onMessage);
        window.removeEventListener("unhandledrejection", onRejection);
      }
    },
    [connectAsync, connector],
  );

  const disconnectWallet = useCallback(async () => {
    setMenuOpen(false);
    window.localStorage.removeItem(RECOGNIZED_WALLET_KEY);
    setRecognized(null);
    await disconnectAsync().catch(() => undefined);
  }, [disconnectAsync]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [address]);

  const connectE2E = useCallback(async () => {
    if (!e2eConnector) return;
    setMenuOpen(false);
    setError(null);
    try {
      await connectAsync({ connector: e2eConnector });
    } catch (caught) {
      setError(explainConnectError(caught));
    }
  }, [connectAsync, e2eConnector]);

  const label = isConnected && address ? shortAddress(address) : local ? "连接 E2E" : "连接钱包";
  const walletName = local ? "E2E" : (recognized ?? "WalletConnect");

  return (
    <>
      <div className="wallet" ref={rootRef}>
        <button
          type="button"
          className="wallet-trigger"
          data-testid={isConnected ? "wallet-address" : "connect-wallet"}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="wallet-dot" data-connected={isConnected ? "true" : "false"} />
          <span>{label}</span>
        </button>

        {menuOpen ? (
          <div className="wallet-menu" role="menu">
            {isConnected && address ? (
              <>
                <p className="menu-kicker">已识别钱包</p>
                <p className="menu-address">{address}</p>
                <p className="menu-meta">
                  {walletName} · {chain?.name ?? "Ethereum"}
                </p>
                <button type="button" className="menu-action" onClick={() => void copyAddress()}>
                  {copied ? "已复制" : "复制地址"}
                </button>
                <button type="button" className="menu-action danger" onClick={() => void disconnectWallet()}>
                  断开连接
                </button>
              </>
            ) : e2eConnector ? (
              <>
                <p className="menu-kicker">E2E 私钥</p>
                <p className="menu-meta">交易在本地签名，发到 127.0.0.1:8545。没有 MetaMask 确认窗。</p>
                <button type="button" className="menu-action" data-testid="connect-e2e" onClick={() => void connectE2E()}>
                  连接 E2E
                </button>
              </>
            ) : getWalletConnectProjectId() ? (
              <>
                <p className="menu-kicker">选择钱包</p>
                <ul className="wallet-list">
                  {WALLETS.map((wallet) => (
                    <li key={wallet.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className="wallet-option"
                        data-testid={`wallet-option-${wallet.id}`}
                        onClick={() => void chooseWallet(wallet)}
                      >
                        <WalletMark id={wallet.id} />
                        <span>
                          <strong>{wallet.name}</strong>
                          <em>{wallet.hint}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="menu-meta">缺少 Project ID</p>
            )}
          </div>
        ) : null}
        {error && !activeWallet ? <p className="wallet-error">{error}</p> : null}
      </div>

      {activeWallet ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeQr}>
          <div
            className="qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            data-testid="qr-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="qr-close" onClick={closeQr} aria-label="关闭">
              关闭
            </button>
            <div className="qr-wallet">
              <WalletMark id={activeWallet.id} />
              <div>
                <p className="menu-kicker">扫码连接</p>
                <h2 id="qr-title">{activeWallet.name}</h2>
              </div>
            </div>
            {error ? (
              <p className="qr-error" role="alert">
                {error}
              </p>
            ) : uri ? (
              <QrCode value={uri} />
            ) : (
              <div className="qr-frame qr-frame-empty">正在生成二维码</div>
            )}
            <p className="qr-hint">
              {error
                ? "换用已允许的域名，或更新 Project ID 后再试。"
                : `打开 ${activeWallet.name}，扫描二维码。确认后页面会识别这个钱包。`}
            </p>
            {error ? (
              <button type="button" className="menu-action" onClick={() => void chooseWallet(activeWallet)}>
                重新生成
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
