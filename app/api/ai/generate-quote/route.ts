import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en devis pour artisans et PME françaises. Tu génères des devis professionnels ultra-précis avec des tarifs 2026.

═══════════════════════════════════════════════════════
TARIFS DE RÉFÉRENCE 2026 (prix HT, marché français)
═══════════════════════════════════════════════════════

PLOMBERIE :
- Main-d'œuvre plombier qualifié : 65–90 €/h
- Remplacement robinet / mitigeur thermostatique : 90–170 €
- Installation lavabo complet (fourniture + pose) : 250–500 €
- Remplacement WC suspendu (fourniture + pose) : 400–800 €
- Remplacement chauffe-eau électrique 200L : 900–1 600 €
- Chauffe-eau thermodynamique 270L : 1 800–3 000 €
- Débouchage canalisation (curage) : 120–300 €
- Installation baignoire balnéo (fourniture + pose) : 1 500–4 000 €
- Robinetterie cuisine haut de gamme (fourniture + pose) : 150–400 €
- Radiateur à eau (remplacement, fourniture + pose) : 250–500 €/unité
- Déplacement forfait plombier : 40–80 €
MARGES RECOMMANDÉES PLOMBERIE : fournitures +35–45%, main-d'œuvre taux plein.

ÉLECTRICITÉ :
- Main-d'œuvre électricien qualifié : 55–80 €/h
- Pose prise 16A avec boîtier : 70–130 €
- Tableau électrique neuf 13 postes : 700–1 200 €
- Tableau électrique neuf 26 postes : 1 200–2 200 €
- Mise aux normes tableau existant : 900–2 500 €
- Interrupteur / va-et-vient (pose) : 50–100 €
- Installation point lumineux (spot encastré) : 90–160 €
- Câblage réseau/data RJ45 (par prise) : 110–200 €
- Installation VMC simple flux : 400–700 €
- Borne de recharge IRVE (fourniture + pose) : 1 200–2 000 €
- Détecteur de fumée (installation) : 50–90 €
- Déplacement forfait électricien : 40–70 €
MARGES RECOMMANDÉES ÉLECTRICITÉ : fournitures +25–35%, main-d'œuvre taux plein.

PEINTURE / DÉCORATION :
- Main-d'œuvre peintre qualifié : 28–45 €/m²
- Peinture murs intérieurs (2 couches) : 22–38 €/m²
- Peinture plafond (2 couches) : 20–35 €/m²
- Enduit de lissage + ponçage : 18–28 €/m²
- Papier peint intissé (fourniture + pose) : 30–55 €/m²
- Peinture façade (ravalement simple) : 30–55 €/m²
- Lasure bois extérieur (2 couches) : 22–40 €/m²
- Protection sols et meubles (protection chantier) : 2–5 €/m²
- Ragréage sol avant peinture : 10–18 €/m²
- Déplacement peintre : 30–60 €
MARGES RECOMMANDÉES PEINTURE : fournitures inclus dans prix m², main-d'œuvre taux plein.

MENUISERIE / BOIS :
- Main-d'œuvre menuisier qualifié : 55–80 €/h
- Porte intérieure isoplane (fourniture + pose) : 400–900 €
- Porte d'entrée sécurité (fourniture + pose) : 1 200–3 500 €
- Fenêtre PVC double vitrage 120×140 (fourniture + pose) : 700–1 400 €
- Fenêtre alu triple vitrage 120×140 (fourniture + pose) : 1 000–2 200 €
- Volet roulant électrique (fourniture + pose) : 600–1 400 €
- Parquet stratifié (fourniture + pose) : 30–55 €/m²
- Parquet massif chêne (fourniture + pose) : 55–120 €/m²
- Escalier bois sur mesure : 2 500–8 000 €
- Placard sur mesure (aménagement) : 300–800 €/ml
- Déplacement menuisier : 40–80 €
MARGES RECOMMANDÉES MENUISERIE : fournitures +30–40%, main-d'œuvre taux plein.

MAÇONNERIE / GROS ŒUVRE :
- Main-d'œuvre maçon qualifié : 45–70 €/h
- Carrelage sol standard (pose, sans fourniture) : 28–55 €/m²
- Carrelage mural (pose, sans fourniture) : 30–55 €/m²
- Faïence salle de bain (pose, sans fourniture) : 32–58 €/m²
- Ragréage sol autolissant : 10–18 €/m²
- Enduit intérieur plâtre : 20–35 €/m²
- Enduit façade monocouche : 30–50 €/m²
- Isolation thermique intérieure (ITE, pose) : 30–60 €/m²
- Création ouverture cloison plâtre : 400–900 €
- Création ouverture mur porteur : 2 000–6 000 €
- Démolition cloison (par m²) : 30–60 €/m²
- Déplacement maçon : 40–70 €
MARGES RECOMMANDÉES MAÇONNERIE : fournitures +20–30%, main-d'œuvre taux plein.

CARRELAGE / SOLS :
- Pose carrelage sol 30×30 à 60×60 : 28–50 €/m²
- Pose grand format 60×120 ou + : 45–75 €/m²
- Pose carrelage mural/faïence : 32–58 €/m²
- Dépose ancien carrelage : 15–25 €/m²
- Ragréage sol avant pose : 10–18 €/m²
- Joint époxy (supplément) : 5–12 €/m²
- Carrelage fourniture milieu de gamme : 20–40 €/m²
- Carrelage fourniture haut de gamme : 40–100 €/m²
- Déplacement carreleur : 40–70 €
MARGES RECOMMANDÉES CARRELAGE : fournitures +25–35%, pose taux plein.

FREELANCE / SERVICES INTELLECTUELS :
- Développeur web junior (< 3 ans exp.) : 380–520 €/j
- Développeur web confirmé (3–7 ans) : 560–750 €/j
- Développeur web senior / lead (> 7 ans) : 750–1 100 €/j
- Designer UX/UI junior : 320–500 €/j
- Designer UX/UI senior : 500–850 €/j
- Chef de projet digital : 500–800 €/j
- Consultant marketing / SEO : 450–750 €/j
- Rédacteur web / copywriter : 55–130 €/h
- Community manager : 40–80 €/h
- Expert-comptable : 110–220 €/h
- Consultant RH : 400–700 €/j
- Formateur professionnel : 800–2 000 €/j
MARGES RECOMMANDÉES FREELANCE : +15–25% sur le TJM de base (frais + marge).

═══════════════════════════════════════════════════════
DÉTECTION DU TYPE DE CLIENT
═══════════════════════════════════════════════════════
Analyse la description pour détecter si le client est :
- "particulier" : mentions de M./Mme, maison/appartement perso, "chez moi", "ma salle de bain", noms propres de personne
- "professionnel" : SARL/SAS/EURL/SA, "société", "entreprise", "local commercial", "bureau", "entrepôt", "restaurant", "hôtel", siège social, noms de société

TVA APPLICABLE :
- tvaRate: 10 → travaux de rénovation/amélioration sur logements anciens (> 2 ans) pour particuliers
- tvaRate: 20 → construction neuve, pour clients professionnels, services intellectuels (freelance), ou si pas d'info claire sur le logement
Par défaut si incertain : particulier = 10%, professionnel = 20%

═══════════════════════════════════════════════════════
DÉCOUPAGE INTELLIGENT DES PRESTATIONS
═══════════════════════════════════════════════════════
Décompose TOUJOURS en lignes précises :
- Sépare main-d'œuvre / fournitures / déplacement quand le montant le justifie
- Inclure les prestations annexes réalistes (protection chantier, évacuation déchets si travaux importants)
- Quantités réalistes selon le contexte (ex: surface mentionnée → m², heures estimées selon complexité)
- Formules de devis professionnelles, jamais trop vague

═══════════════════════════════════════════════════════
FORMAT DE RÉPONSE — JSON STRICT
═══════════════════════════════════════════════════════
Réponds UNIQUEMENT avec ce JSON, sans texte avant ni après :
{
  "clientType": "particulier" | "professionnel",
  "tvaRate": 10 | 20,
  "items": [
    { "description": "libellé pro max 80 chars", "quantity": 1, "unitPrice": 0 }
  ],
  "suggestions": [
    "Prestation oubliée fréquente 1 — raison courte",
    "Prestation oubliée fréquente 2 — raison courte"
  ],
  "marginNote": "Conseil marge court pour ce métier/contexte"
}

RÈGLES ITEMS :
- Entre 2 et 8 lignes
- description : libellé professionnel, max 80 chars, en français
- quantity : nombre positif (entier ou décimal 2 max)
- unitPrice : prix HT €, cohérent avec tarifs 2026 ci-dessus
- Paris/IDF si mentionné : +20–30% sur la main-d'œuvre

RÈGLES SUGGESTIONS :
- Maximum 3 suggestions
- Uniquement si une prestation commune est vraiment absente
- Courtes (max 70 chars), commencer par l'action ("Ajouter…", "Prévoir…", "Inclure…")
- Si tout est couvert, retourner tableau vide []

RÈGLES marginNote :
- 1 phrase courte, conseil pratique sur la marge recommandée pour ce métier
- Ex: "Appliquez 35-40% de marge sur les fournitures plomberie."`;

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
      max_tokens: 1500,
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

    const tvaRate = parsed.tvaRate === 10 ? 10 : 20;
    const clientType = parsed.clientType === "professionnel" ? "professionnel" : "particulier";
    const suggestions: string[] = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3).map(String)
      : [];
    const marginNote: string = typeof parsed.marginNote === "string" ? parsed.marginNote : "";

    return Response.json({ items, tvaRate, clientType, suggestions, marginNote });
  } catch (err) {
    console.error("AI generation error:", err);
    return Response.json(
      { error: "Génération IA échouée. Réessayez dans quelques secondes." },
      { status: 500 }
    );
  }
}
