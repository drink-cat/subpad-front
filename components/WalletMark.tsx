import type { WalletId } from "@/lib/wallets";

export function WalletMark({ id }: { id: WalletId }) {
  if (id === "metamask") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#F6851B" />
        <path fill="#fff" d="M22.7 8.2 16.8 12.6l1.1-2.6 4.8-1.8Z" />
        <path fill="#fff" d="M9.3 8.2 15.1 12.7 14 10l-4.7-1.8Z" />
        <path fill="#E2761B" d="m8.4 18.4 1.8 3.6 3.7-1.2-1.3-2.1-4.2-.3Z" />
        <path fill="#E2761B" d="M18.1 18.7 16.8 20.8l3.7 1.2 1.8-3.6-4.2.3Z" />
        <path fill="#233447" d="M14 16.2 12.6 18.7l5.2.2-1.4-2.7-2.4 0Z" />
        <path fill="#CD6116" d="M9.3 8.2 11 14.4l-2.6 3.7 1-9.9Z" />
        <path fill="#CD6116" d="M22.7 8.2 21 14.4l2.6 3.7-1-9.9Z" />
        <path fill="#E4751F" d="M11 14.4 14 16.2l-1.4 2.5-1.3-2.1L11 14.4Z" />
        <path fill="#E4751F" d="M21 14.4 16.8 16.2l1.3 2.5 1.3-2.1L21 14.4Z" />
        <path fill="#F6851B" d="m14 16.2-1.4 2.5 1.8 1.3 1.2-2.6-1.6-1.2Z" />
        <path fill="#F6851B" d="m18.1 16.2-1.2 2.6 1.2 1.3 1.8-1.3-1.8-2.6Z" />
        <path fill="#C0AD9E" d="M15.6 19.9 14 20.8l1.2.8h1.6l1.2-.8-1.4-.9Z" />
        <path fill="#161616" d="M16.8 12.6 18 10l-1.2-.6h-1.6L14 10l1.1 2.6.8.6.9-.6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0500FF" />
      <text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="ui-sans-serif, sans-serif" fontWeight="700">
        TW
      </text>
    </svg>
  );
}
