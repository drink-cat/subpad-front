"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1c1915", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className="qr-frame qr-frame-empty" aria-hidden="true" />;
  }

  return <img className="qr-frame" src={src} width={280} height={280} alt="钱包连接二维码" />;
}
