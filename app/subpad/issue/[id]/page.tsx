import { Suspense } from "react";
import { IssuePanel } from "@/components/IssuePanel";

export default function IssueForPadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="page" />}>
      <PadIssue params={params} />
    </Suspense>
  );
}

async function PadIssue({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssuePanel subpadId={id} />;
}
