import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  let body: { description: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return Response.json({ error: "description required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "ta_clé_ici") {
    // Return mock items for development without API key
    return Response.json({
      items: [
        { id: `ai-0-${Date.now()}`, description: "Main-d'œuvre (prestation décrite)", quantity: 1, unitPrice: 350, total: 350 },
        { id: `ai-1-${Date.now()}`, description: "Fournitures et matériaux", quantity: 1, unitPrice: 120, total: 120 },
        { id: `ai-2-${Date.now()}`, description: "Déplacement et transport", quantity: 1, unitPrice: 50, total: 50 },
      ],
    });
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: `Tu es un assistant expert en devis pour artisans et freelances français.
Génère des lignes de devis professionnelles basées sur la description fournie.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
Format exact: {"items": [{"description": "...", "quantity": 1, "unitPrice": 0}]}
Règles:
- description: libellé professionnel court et précis (max 80 chars)
- quantity: nombre positif (entier ou décimal avec 2 max)
- unitPrice: prix HT en euros, cohérent avec le marché français actuel
- Maximum 8 lignes, minimum 2
- Pas de TVA dans les prix (c'est du HT)`,
      messages: [
        { role: "user", content: `Génère un devis pour : ${body.description}` },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Extract JSON even if Claude adds some text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    const now = Date.now();

    const items = (parsed.items ?? []).map(
      (
        item: { description: string; quantity: number; unitPrice: number },
        i: number
      ) => ({
        id: `ai-${i}-${now}`,
        description: String(item.description ?? ""),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      })
    );

    return Response.json({ items });
  } catch (err) {
    console.error("AI generation error:", err);
    return Response.json(
      { error: "Génération IA échouée. Vérifiez votre clé ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }
}
