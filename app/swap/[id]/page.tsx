import { Suspense } from "react";
import { SwapPanel } from "@/components/SwapPanel";

export default function SwapPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="page" />}>
      <SwapToken params={params} />
    </Suspense>
  );
}

async function SwapToken({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SwapPanel tokenId={id} />;
}
