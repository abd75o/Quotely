import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant Quotely. Tu aides les artisans et freelances à gérer leurs devis et leur activité.

ADAPTATION AU LANGAGE DE L'UTILISATEUR — RÈGLE ABSOLUE :
- Si le message est en SMS / argot / abréviations / avec des fautes → réponds en langage simple, court, direct. Pas de politesse excessive, pas de jargon.
- Si le message est formel ou professionnel → réponds de façon plus structurée mais toujours concise.
- Si tu détectes une personne âgée ou peu à l'aise avec l'écrit → sois encore plus simple, des phrases très courtes, un seul sujet à la fois.
- JAMAIS de grands paragraphes. Maximum 2–3 lignes par réponse. Si plus d'infos sont nécessaires, divise en plusieurs échanges.
- JAMAIS de bullet points longs ou de listes à rallonge. Au plus 3 éléments par liste.
- Pas de "Bien sûr !", "Absolument !", "Je serais ravi de vous aider". Vas droit au but.

TU PEUX :
- Consulter les devis (statuts, montants, clients)
- Afficher les statistiques de l'activité
- Conseiller sur les relances clients
- Donner des conseils business simples et directs
- Expliquer les fonctionnalités de Quotely en 1 phrase

RÈGLES DONNÉES :
- Utilise les outils pour récupérer les données réelles avant de répondre
- Ne jamais inventer de chiffres — toujours vérifier avec les outils d'abord`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  let body: { messages: Message[]; metier?: string };

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.messages?.length) {
    return new Response("messages required", { status: 400 });
  }

  // Get authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const metier = body.metier ?? "artisan";

  const tools: Anthropic.Tool[] = [
    {
      name: "get_user_quotes",
      description:
        "Récupère les devis de l'utilisateur avec leurs statuts, montants et informations clients. Utiliser pour répondre à des questions sur les devis.",
      input_schema: {
        type: "object" as const,
        properties: {
          status: {
            type: "string",
            enum: ["all", "draft", "pending", "signed", "refused", "invoiced"],
            description: "Filtrer par statut (all = tous les devis)",
          },
          limit: {
            type: "number",
            description: "Nombre maximum de devis à récupérer (défaut: 10)",
          },
        },
        required: [],
      },
    },
    {
      name: "get_user_stats",
      description:
        "Récupère les statistiques globales de l'utilisateur : nombre de devis, taux de signature, chiffre d'affaires total.",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ];

  async function executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    if (name === "get_user_quotes") {
      const status = (input.status as string) ?? "all";
      const limit = (input.limit as number) ?? 10;

      let query = supabase
        .from("quotes")
        .select(
          "id, number, status, total, created_at, valid_until, clients(name)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) return `Erreur: ${error.message}`;
      if (!data?.length) return "Aucun devis trouvé.";

      return JSON.stringify(
        data.map((q) => ({
          numéro: q.number,
          statut: q.status,
          total: `${q.total} €`,
          client: (q.clients as unknown as { name: string } | null)?.name ?? "Sans client",
          créé_le: new Date(q.created_at).toLocaleDateString("fr-FR"),
          valide_jusqu: q.valid_until
            ? new Date(q.valid_until).toLocaleDateString("fr-FR")
            : null,
        }))
      );
    }

    if (name === "get_user_stats") {
      const { data, error } = await supabase
        .from("quotes")
        .select("status, total")
        .eq("user_id", userId);

      if (error) return `Erreur: ${error.message}`;

      const total = data?.length ?? 0;
      const signed = data?.filter((q) => q.status === "signed").length ?? 0;
      const pending = data?.filter((q) => q.status === "pending").length ?? 0;
      const refused = data?.filter((q) => q.status === "refused").length ?? 0;
      const invoiced = data?.filter((q) => q.status === "invoiced").length ?? 0;
      const ca = data
        ?.filter((q) => q.status === "signed" || q.status === "invoiced")
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0) ?? 0;
      const tauxSignature =
        total > 0 ? Math.round((signed / total) * 100) : 0;

      return JSON.stringify({
        total_devis: total,
        en_attente: pending,
        signés: signed,
        refusés: refused,
        facturés: invoiced,
        taux_signature: `${tauxSignature}%`,
        chiffre_affaires_HT: `${ca.toFixed(2)} €`,
      });
    }

    return "Outil inconnu";
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(text: string) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
        );
      }

      function sendDone() {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }

      try {
        const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let continueLoop = true;
        while (continueLoop) {
          const response = await client.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 1024,
            thinking: { type: "adaptive" },
            system: [
              {
                type: "text",
                text: `${SYSTEM_PROMPT}\n\nMétier de l'utilisateur : ${metier}`,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools,
            messages,
          });

          // Collect assistant response
          const assistantContent: Anthropic.ContentBlock[] = [];

          for (const block of response.content) {
            if (block.type === "text") {
              assistantContent.push(block);
              send(block.text);
            } else if (block.type === "tool_use") {
              assistantContent.push(block);
            }
          }

          if (
            response.stop_reason === "end_turn" ||
            !response.content.some((b) => b.type === "tool_use")
          ) {
            continueLoop = false;
          } else {
            // Execute tools and continue loop
            messages.push({ role: "assistant", content: assistantContent });

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
              if (block.type === "tool_use") {
                const result = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>
                );
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result,
                });
              }
            }

            messages.push({ role: "user", content: toolResults });
          }
        }

        sendDone();
      } catch (err) {
        console.error("Chat error:", err);
        send(
          "\n\n*Une erreur est survenue. Veuillez réessayer dans quelques instants.*"
        );
        sendDone();
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
