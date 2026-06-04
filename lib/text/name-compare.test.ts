// Tests de normalizeForCompare + signerNameMatches — sans dépendance ni runner.
// Lancer :  node lib/text/name-normalize.test.ts   (Node ≥ 22 strippe les types)
import { normalizeForCompare, signerNameMatches } from "./name-compare.ts";

let pass = 0;
const fails: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) {
    pass += 1;
    console.log("✓ " + name);
  } else {
    fails.push(name);
    console.log("✗ ECHEC | " + name);
  }
}

// ── normalizeForCompare ────────────────────────────────────────────────────
check('casse: "DUPONT" → "dupont"', normalizeForCompare("DUPONT") === "dupont");
check('accents: "François" → "francois"', normalizeForCompare("François") === "francois");
check('accents: "Éléonore" → "eleonore"', normalizeForCompare("Éléonore") === "eleonore");
check('tirets: "Jean-Pierre" → "jean pierre"', normalizeForCompare("Jean-Pierre") === "jean pierre");
check('espaces: "  Marie   Anne " → "marie anne"', normalizeForCompare("  Marie   Anne ") === "marie anne");
check("vide / null → ''", normalizeForCompare(null) === "" && normalizeForCompare("   ") === "");

// ── signerNameMatches : correspondances tolérantes sur la forme ─────────────
check('exact: "Marie Dupont" vs (Marie, Dupont)', signerNameMatches("Marie Dupont", "Marie", "Dupont"));
check('casse: "marie DUPONT"', signerNameMatches("marie DUPONT", "Marie", "Dupont"));
check('accents: "Francois Lefebvre" vs (François, Lefèbvre)', signerNameMatches("Francois Lefebvre", "François", "Lefèbvre"));
check('ordre inversé: "Dupont Marie"', signerNameMatches("Dupont Marie", "Marie", "Dupont"));
check('tiret composé: "Jean Pierre Martin" vs (Jean-Pierre, Martin)', signerNameMatches("Jean Pierre Martin", "Jean-Pierre", "Martin"));
check('tiret saisi: "Jean-Pierre Martin" vs (Jean Pierre, Martin)', signerNameMatches("Jean-Pierre Martin", "Jean Pierre", "Martin"));
check('espaces en trop: "  Marie    Dupont  "', signerNameMatches("  Marie    Dupont  ", "Marie", "Dupont"));

// ── signerNameMatches : refus stricts sur le fond ───────────────────────────
check('refus 1 lettre (nom): "Marie Dupond" ≠ Dupont', !signerNameMatches("Marie Dupond", "Marie", "Dupont"));
check('refus 1 lettre (prénom): "Mari Dupont" ≠ Marie', !signerNameMatches("Mari Dupont", "Marie", "Dupont"));
check('refus nom totalement différent: "Marie Curie"', !signerNameMatches("Marie Curie", "Marie", "Dupont"));
check('refus prénom manquant: "Dupont"', !signerNameMatches("Dupont", "Marie", "Dupont"));
check('refus token en trop: "Marie Claire Dupont"', !signerNameMatches("Marie Claire Dupont", "Marie", "Dupont"));
check("refus saisie vide", !signerNameMatches("", "Marie", "Dupont"));
check("refus attendu vide", !signerNameMatches("Marie Dupont", "", ""));

console.log(`\n${pass}/${pass + fails.length} OK`);
if (fails.length > 0) process.exit(1);
