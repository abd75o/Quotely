import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChatLayout } from "@/components/redacteur/ChatLayout";
import type {
  Message,
  MessageEmbed,
  RedacteurClient,
} from "@/components/redacteur/types";

export const metadata: Metadata = {
  title: "Le Rédacteur — Quovi",
};

interface LoadedData {
  conversationId: string | null;
  messages: Message[];
  recent: RedacteurClient[];
  all: RedacteurClient[];
}

const EMPTY: LoadedData = {
  conversationId: null,
  messages: [],
  recent: [],
  all: [],
};

async function loadEverything(): Promise<LoadedData> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;

    const [conversation, clientsResp] = await Promise.all([
      loadRecentConversation(supabase, user.id),
      supabase
        .from("clients")
        .select("id, name, email, phone, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const clients = (clientsResp.data ?? []) as Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }>;

    const all: RedacteurClient[] = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
    }));

    return {
      conversationId: conversation.conversationId,
      messages: conversation.messages,
      recent: all.slice(0, 3),
      all,
    };
  } catch {
    return EMPTY;
  }
}

// Tables agent_conversations / agent_messages may not exist yet (sprint 2).
// On encapsule dans un try/catch pour démarrer avec une conversation vide.
async function loadRecentConversation(
  supabase: Awaited<ReturnType<typeof importServerClient>>,
  userId: string,
): Promise<{ conversationId: string | null; messages: Message[] }> {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: conv, error: convErr } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("agent_type", "redacteur")
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convErr || !conv) return { conversationId: null, messages: [] };

    const conversationId = String(conv.id);
    const { data: rows, error: msgErr } = await supabase
      .from("agent_messages")
      .select("id, role, content, embed")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgErr || !rows) return { conversationId, messages: [] };

    const messages: Message[] = rows.map((row) => ({
      id: String(row.id),
      role: row.role as Message["role"],
      content: (row.content as string | null) ?? undefined,
      embed: (row.embed as MessageEmbed | null) ?? undefined,
    }));

    return { conversationId, messages };
  } catch {
    return { conversationId: null, messages: [] };
  }
}

async function importServerClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

export default async function RedacteurPage() {
  const { conversationId, messages, recent, all } = await loadEverything();

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-6xl flex-col">
      <header className="mb-3 flex-shrink-0">
        <Link
          href="/dashboard/equipe"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;équipe
        </Link>
      </header>

      <div className="min-h-0 flex-1">
        <ChatLayout
          initialMessages={messages}
          recentClients={recent}
          allClients={all}
          conversationId={conversationId}
        />
      </div>
    </div>
  );
}
