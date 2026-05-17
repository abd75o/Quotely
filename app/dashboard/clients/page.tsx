import type { Metadata } from "next";
import { ClientsList } from "@/components/clients/ClientsList";
import { listClientsWithStats, type ClientWithStats } from "@/lib/clients/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients — Quovi",
  robots: { index: false, follow: false },
};

async function getClients(): Promise<ClientWithStats[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    return await listClientsWithStats(supabase, user.id);
  } catch (err) {
    console.error("[dashboard/clients] getClients failed:", err);
    return [];
  }
}

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientsList initialClients={clients} />;
}
