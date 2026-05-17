import type { Metadata } from "next";
import { EmileLayout } from "@/components/emile/EmileLayout";

export const metadata: Metadata = {
  title: "Émile — Quovi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EmileConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <EmileLayout conversationId={conversationId} />;
}
