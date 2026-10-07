import { Suspense } from "react";
import { IssuePanel } from "@/components/IssuePanel";

export default function CreateTokenForPadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="page" />}>
      <PadCreateToken params={params} />
    </Suspense>
  );
}

async function PadCreateToken({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssuePanel subpadId={id} />;
}
