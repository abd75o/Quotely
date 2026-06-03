// Parser PUR du mode import en masse (extrait de BulkImportModal pour être
// testable et réutilisable). AUCUN import React/UI ici : uniquement la logique
// de transformation "texte collé → lignes de devis". Source de vérité unique du
// parsing ; le composant importe UNITS / DraftRow / freshId / parseBulk.
//
// Tests : `node components/../lib/bulk/parse-line.test.ts` (Node ≥ 22 strippe les types).

export const UNITS: Array<{ value: string; label: string }> = [
  { value: "", label: "—" },
  { value: "u", label: "u" },
  { value: "h", label: "h" },
  { value: "j", label: "j" },
  { value: "m", label: "m" },
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "ml", label: "ml" },
  { value: "kg", label: "kg" },
  { value: "l", label: "l" },
  { value: "forfait", label: "forfait" },
];

export interface DraftRow {
  id: string;
  label: string;
  quantity: string;
  unite: string;
  price: string;
  tva: number;
}

let rowSeq = 0;
export function freshId(): string {
  rowSeq += 1;
  return `r-${Date.now().toString(36)}-${rowSeq}`;
}

// ─── Parsing heuristics ──────────────────────────────────────────────────────
//
// We try formats in decreasing order of structure. Anything we can't parse
// confidently lands in the `label` column with quantity/price blank, so the
// artisan only has to fill the missing cells instead of typing everything.

function normalisePrice(raw: string): string {
  // Strip currency / spaces, French decimal → JS decimal.
  return raw
    .replace(/€|EUR| |\s+/gi, "")
    .replace(/,(\d{1,2})$/, ".$1");
}

function parseNumber(raw: string): number | null {
  const cleaned = normalisePrice(raw);
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function stripLeadingNumber(s: string): string {
  // "1. Dépose baignoire" / "12) Pose carrelage" / "3 - Reprise plomberie"
  // → drop the bullet so the label cell carries the prestation only.
  return s.replace(/^\s*\d+\s*[.)\-–—:]\s*/, "");
}

// Normalise un token d'unité (insensible casse/accents/pluriel) vers une des
// valeurs du <select> UNITS (m², m³, ml, m, u, h, j, kg, l, forfait). Renvoie
// null si non reconnu — on laissera alors l'unité vide (pas de régression).
function normalizeUnit(raw: string): string | null {
  const u = raw.toLowerCase().trim().replace(/\.$/, "");
  switch (u) {
    case "m²":
    case "m2":
    case "metre carre":
    case "mètre carré":
    case "metres carres":
    case "mètres carrés":
      return "m²";
    case "m³":
    case "m3":
      return "m³";
    case "ml":
      return "ml";
    case "m":
    case "metre":
    case "mètre":
    case "metres":
    case "mètres":
      return "m";
    case "u":
    case "unite":
    case "unité":
    case "unites":
    case "unités":
    case "piece":
    case "pièce":
    case "pieces":
    case "pièces":
    case "pcs":
    case "pc":
    case "ens":
    case "ensemble":
      return "u";
    case "forfait":
    case "forfaits":
    case "ft":
    case "frf":
      return "forfait";
    case "h":
    case "heure":
    case "heures":
    case "hr":
    case "hrs":
      return "h";
    case "j":
    case "jour":
    case "jours":
    case "jr":
      return "j";
    case "kg":
    case "kgs":
      return "kg";
    case "l":
    case "litre":
    case "litres":
      return "l";
    default:
      return null;
  }
}

// Capture "<nombre> <token-unité>" (token = lettres/²/³). On valide ensuite le
// token via normalizeUnit, donc un faux ami ("16 mm", "mensuel") est simplement
// ignoré. Le lookahead empêche de couper un mot ("mesure" → pas "m").
// L'alternative `m[23]` capture les variantes ASCII "m2"/"m3" (sinon le token
// alpha couperait "m2" en "m" + "2", donnant l'unité "m" au lieu de "m²").
const QTY_UNIT_RE = /(\d+(?:[.,]\d+)?)\s*(m[23]|[a-zà-ÿ²³]+)(?=$|[^a-zà-ÿ²³])/gi;

interface QtyUnit {
  qty: number;
  unit: string;
  matchText: string;
  index: number;
}

// Renvoie le DERNIER "<nombre> <unité connue>" du texte (le plus proche du prix,
// donc le plus probablement la quantité — ex. "Placard 2m 1 forfait" → 1 forfait,
// pas 2m). null si aucune unité reconnue.
function extractQtyUnit(text: string): QtyUnit | null {
  let best: QtyUnit | null = null;
  for (const m of text.matchAll(QTY_UNIT_RE)) {
    const unit = normalizeUnit(m[2]);
    if (unit == null) continue;
    const qty = parseNumber(m[1]);
    if (qty == null) continue;
    best = { qty, unit, matchText: m[0], index: m.index ?? 0 };
  }
  return best;
}

// Extrait le prix en FIN de ligne (dernier nombre monétaire, avec ou sans
// €/EUR/HT). Garde-fou n°1 : priorité absolue au prix. Renvoie le reste (label
// + éventuelle qté/unité) sans le prix.
function extractTrailingPrice(text: string): { price: number | null; rest: string } {
  const t = text.trim();
  const m = /([\d][\d.,\s]*)\s*(?:€|EUR|HT)?\s*$/i.exec(t);
  if (m && /\d/.test(m[1])) {
    const price = parseNumber(m[1]);
    if (price != null) {
      const rest = t.slice(0, m.index).replace(/[-:–—]\s*$/, "").trim();
      return { price, rest };
    }
  }
  return { price: null, rest: t };
}

// Cherche qté + unité dans les segments du MILIEU (entre label et prix) d'une
// ligne à séparateurs. Gère "45 m²" (combiné) comme "45" + "m²" (deux cellules).
function findQtyUnitInSegments(
  segs: string[],
): { qty: number | null; unit: string } {
  // 1) "<num> <unité>" combiné dans une seule cellule.
  for (const seg of segs) {
    const e = extractQtyUnit(seg);
    if (e) return { qty: e.qty, unit: e.unit };
  }
  // 2) Cellules séparées : un nombre pur d'un côté, une unité pure de l'autre.
  let qty: number | null = null;
  let unit = "";
  for (const seg of segs) {
    const s = seg.trim();
    if (qty == null && /^\d+(?:[.,]\d+)?$/.test(s)) {
      qty = parseNumber(s);
    } else if (!unit) {
      const u = normalizeUnit(s);
      if (u) unit = u;
    }
  }
  return { qty, unit };
}

// Sépare une ligne sur | tab ; tiret cadratin/demi-cadratin, ou " - " (tiret
// entouré d'espaces). NE coupe PAS un mot composé ("plombier-chauffagiste")
// ni "45 m²".
const SEGMENT_SEP = /\s*[|\t;—–]\s*|\s+-\s+/;

export function parseLine(line: string, defaultTva: number): DraftRow {
  const trimmed = line.trim();
  const segments = trimmed
    .split(SEGMENT_SEP)
    .map((s) => s.trim())
    .filter(Boolean);

  // ── Ligne à segments (tableau collé OU "Désignation — 45 m² — 95€") ────────
  if (segments.length >= 2) {
    // Prix = dernier segment contenant un chiffre (le prix est toujours en fin).
    let priceIdx = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (/\d/.test(segments[i])) {
        priceIdx = i;
        break;
      }
    }
    const price =
      priceIdx >= 0 ? extractTrailingPrice(segments[priceIdx]).price : null;
    // Label = 1er segment. Le piège "Placard sur mesure 2m" reste DANS le label
    // (jamais pris comme quantité) tant qu'un segment qté dédié existe.
    let label = stripLeadingNumber(segments[0]).trim();
    const middle = priceIdx > 1 ? segments.slice(1, priceIdx) : [];
    let { qty, unit } = findQtyUnitInSegments(middle);
    // Pas de segment qté dédié (ex. "Carrelage 52 ml — 38€" : 2 segments) ⇒ on
    // extrait la qté+unité collée en FIN du label puis on la retire du libellé.
    // Le piège à 3 segments ("… 2m — 1 forfait — …") n'arrive jamais ici : sa
    // qté ("1 forfait") a déjà été trouvée dans le milieu ci-dessus.
    if (qty == null && !unit) {
      const e = extractQtyUnit(label);
      if (e) {
        qty = e.qty;
        unit = e.unit;
        label = (label.slice(0, e.index) + label.slice(e.index + e.matchText.length))
          .replace(/\s{2,}/g, " ")
          .replace(/[-:–—]\s*$/, "")
          .trim();
      }
    }
    // On ne retient ce chemin que s'il a produit qqch d'exploitable (prix ou
    // qté/unité) ; sinon on retombe sur l'analyse inline plus bas.
    if (price != null || qty != null || unit) {
      return {
        id: freshId(),
        label: label || trimmed,
        quantity: qty != null ? String(qty) : "1",
        unite: unit,
        price: price != null ? String(price) : "",
        tva: defaultTva,
      };
    }
  }

  // ── Ligne inline (sans séparateur fiable) : "Parquet chêne 45 m² 95€" ──────
  const stripped = stripLeadingNumber(trimmed);
  const { price, rest } = extractTrailingPrice(stripped);
  // Qté/unité = DERNIER "<num> <unité>" du reste (un "2m" noyé dans un libellé
  // perd face au "1 forfait" placé juste avant le prix).
  const qtyUnit = extractQtyUnit(rest);
  if (price != null || qtyUnit) {
    let label = rest;
    if (qtyUnit) {
      // Retire le token qté+unité du libellé pour qu'il reste propre.
      label = (
        rest.slice(0, qtyUnit.index) +
        rest.slice(qtyUnit.index + qtyUnit.matchText.length)
      )
        .replace(/\s{2,}/g, " ")
        .replace(/[-:–—]\s*$/, "")
        .trim();
    }
    return {
      id: freshId(),
      label: label || stripped || trimmed,
      quantity: qtyUnit ? String(qtyUnit.qty) : "1",
      unite: qtyUnit ? qtyUnit.unit : "",
      price: price != null ? String(price) : "",
      tva: defaultTva,
    };
  }

  // ── Fallback : toute la ligne en label, l'artisan complète le reste. ───────
  return {
    id: freshId(),
    label: stripped || trimmed,
    quantity: "1",
    unite: "",
    price: "",
    tva: defaultTva,
  };
}

// ─── Filtrage des lignes non-prestation (intro e-mail, titres de section) ────
//
// Un collage réel contient souvent des politesses ("Bonjour, voici le détail")
// et des titres de section ("— Salle de bain —", "Plomberie :") qui ne sont PAS
// des lignes de devis. On les écarte pour que l'artisan n'ait pas à supprimer
// ces rangs à prix vide à la main.
//
// SÉCURITÉ : on ne filtre JAMAIS une ligne contenant un chiffre. Toute ligne
// chiffrée (prix, quantité, n°) est donc toujours conservée — un faux positif
// ne peut coûter qu'un libellé à retaper, jamais la perte d'une ligne chiffrée.
const GREETING_RE =
  /^(bonjour|bonsoir|madame|monsieur|messieurs|mesdames|cher|chère|chers|merci|cordialement|bien à vous|bien cordialement|salutations|sincères salutations|veuillez|ci-joint|ci-dessous|ci-après|voici|voilà|suite à|comme convenu|en vous remerciant|dans l'attente|à votre disposition|n'hésitez pas|objet\s*:)/i;

// Caractères de décoration utilisés pour encadrer un titre de section.
const DECO = "\\-=*_#~•·▪►–—.";

function isNonItemLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  // Garde-fou absolu : un chiffre ⇒ ligne potentiellement chiffrée ⇒ conservée.
  if (/\d/.test(t)) return false;
  // Politesses / intro d'e-mail.
  if (GREETING_RE.test(t)) return true;
  // Séparateur pur ("─────", "*****").
  if (new RegExp(`^[\\s${DECO}]+$`).test(t)) return true;
  // Titre encadré de décoration ("=== Cuisine ===", "— Salle de bain —").
  const core = t
    .replace(new RegExp(`^[\\s${DECO}]+`), "")
    .replace(new RegExp(`[\\s${DECO}]+$`), "")
    .trim();
  if (core.length > 0 && core.length < t.length && core.length <= 40) return true;
  // Titre de section terminé par ":" et court ("Plomberie :", "Travaux SDB :").
  if (/[:：]\s*$/.test(t) && t.split(/\s+/).length <= 5) return true;
  return false;
}

export function parseBulk(raw: string, defaultTva: number): DraftRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items = lines.filter((l) => !isNonItemLine(l));
  // Si le filtre a TOUT retiré (collage de pure prose, cas rare), on retombe
  // sur le parse intégral plutôt que de laisser l'artisan avec un tableau vide.
  const kept = items.length > 0 ? items : lines;
  return kept.map((l) => parseLine(l, defaultTva));
}
