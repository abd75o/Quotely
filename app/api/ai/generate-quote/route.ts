import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en devis pour artisans et PME françaises. Tu connais parfaitement les tarifs du marché français en 2025-2026.

TARIFS DE RÉFÉRENCE PAR MÉTIER (prix HT, marché français 2025) :

PLOMBERIE :
- Main-d'œuvre plombier : 55–80 €/h
- Remplacement robinet/mitigeur : 80–150 €
- Installation WC/lavabo : 150–400 €
- Remplacement chauffe-eau 200L : 800–1500 € (fournitures + pose)
- Débouchage canalisation : 100–250 €
- Installation radiateur : 200–400 €/unité

ÉLECTRICITÉ :
- Main-d'œuvre électricien : 50–75 €/h
- Pose prise électrique : 60–120 €
- Tableau électrique (rénovation) : 800–2000 €
- Installation luminaire : 80–150 €
- Mise aux normes (par point) : 120–200 €
- Câblage réseau/data : 100–180 €

PEINTURE / DÉCORATION :
- Main-d'œuvre peintre : 25–40 €/m²
- Peinture murs et plafonds : 20–35 €/m²
- Enduit de lissage : 15–25 €/m²
- Papier peint (pose) : 25–45 €/m²
- Lasure/vernis bois : 20–35 €/m²

MENUISERIE :
- Main-d'œuvre menuisier : 50–75 €/h
- Porte intérieure (fourniture + pose) : 350–800 €
- Fenêtre double vitrage (fourniture + pose) : 600–1500 €
- Parquet collé (pose) : 25–40 €/m²
- Escalier sur mesure : 2000–6000 €

MAÇONNERIE / GROS ŒUVRE :
- Maçon : 40–65 €/h
- Carrelage (pose) : 25–50 €/m²
- Ragréage sol : 8–15 €/m²
- Enduit façade : 25–45 €/m²
- Création ouverture (fenêtre standard) : 1500–3500 €

FREELANCE / SERVICES :
- Développeur web junior : 350–500 €/j
- Développeur web senior : 550–900 €/j
- Designer graphique : 300–600 €/j
- Consultant marketing : 400–700 €/j
- Comptable/expert-comptable : 100–200 €/h
- Rédacteur web : 50–120 €/h

PRESTATIONS COMMUNES :
- Déplacement (forfait) : 30–80 €
- Location nacelle/échafaudage : 80–200 €/j
- Benne déchets (6m³) : 200–400 €
- Protection chantier (bâche, film) : 30–100 €

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ni après
2. Format exact : {"items": [{"description": "...", "quantity": 1, "unitPrice": 0}]}
3. description : libellé professionnel court (max 80 caractères), en français
4. quantity : nombre positif (entier ou décimal, 2 décimales max)
5. unitPrice : prix HT en euros entiers ou avec centimes, cohérent avec les tarifs ci-dessus
6. Entre 2 et 8 lignes maximum
7. Pas de TVA dans les prix (uniquement HT)
8. Adapter les prix à la région si mentionnée (Paris/IDF : +20-30%)`;

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

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Génère un devis professionnel pour : ${body.description.trim()}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text.trim() : "";

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
      { error: "Génération IA échouée. Réessayez dans quelques secondes." },
      { status: 500 }
    );
  }
}
