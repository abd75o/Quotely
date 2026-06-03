// Tests du parser d'import en masse — sans dépendance ni runner.
// Lancer :  node lib/bulk/parse-line.test.ts   (Node ≥ 22 strippe les types)
// Importe le MÊME parseLine que le composant (source de vérité unique).
import { parseLine } from "./parse-line.ts";

interface Expect {
  quantity: string;
  unite: string;
  price: string;
}
type Case = [input: string, exp: Expect, total: number, label?: string];

const cases: Case[] = [
  // ── Cas du ticket ──────────────────────────────────────────────────────
  ["Parquet chêne — 45 m² — 95€", { quantity: "45", unite: "m²", price: "95" }, 4275],
  ["Portes intérieures avec huisseries — 3 u — 480€", { quantity: "3", unite: "u", price: "480" }, 1440],
  // Piège : le "2m" du libellé NE doit PAS être pris comme quantité.
  ["Placard sur mesure 2m — 1 forfait — 1850€", { quantity: "1", unite: "forfait", price: "1850" }, 1850, "Placard sur mesure 2m"],
  ["Forfait nettoyage 380€", { quantity: "1", unite: "", price: "380" }, 380],
  // Tableau Excel collé (tab) : colonnes respectées.
  ["Parquet chêne\t45\tm²\t95", { quantity: "45", unite: "m²", price: "95" }, 4275],
  ["Portes\t3\tu\t480", { quantity: "3", unite: "u", price: "480" }, 1440],
  // Inline sans séparateur.
  ["Parquet chêne 45 m² 95€", { quantity: "45", unite: "m²", price: "95" }, 4275, "Parquet chêne"],

  // ── Non-régression (comportement antérieur préservé) ─────────────────────
  ["Dépose baignoire - 280€", { quantity: "1", unite: "", price: "280" }, 280],
  ["Désignation : 280", { quantity: "1", unite: "", price: "280" }, 280],
  ["Reprise plomberie", { quantity: "1", unite: "", price: "" }, 0],
  // "mm" n'est pas une unité reconnue → pas de fausse quantité.
  ["Tuyau PER 16 mm 12€", { quantity: "1", unite: "", price: "12" }, 12],

  // ── Cas limites supplémentaires ──────────────────────────────────────────
  // Qté+unité collée au libellé, 2 segments seulement (pas de segment qté dédié).
  ["Carrelage 52 ml — 38€", { quantity: "52", unite: "ml", price: "38" }, 1976, "Carrelage"],
  // Variante ASCII "m2" → normalisée en m².
  ["Peinture murs 120 m2 | 12,5", { quantity: "120", unite: "m²", price: "12.5" }, 1500, "Peinture murs"],
  ["Isolation combles 35 m3 — 22€", { quantity: "35", unite: "m³", price: "22" }, 770],
  ["Pose 8 h 45€", { quantity: "8", unite: "h", price: "45" }, 360, "Pose"],
  // Prix avec séparateur de milliers + décimales → un seul nombre ⇒ prix, qté 1.
  ["Évacuation gravats 1 850,00 €", { quantity: "1", unite: "", price: "1850" }, 1850],
];

let ok = 0;
const failures: string[] = [];
for (const [input, exp, total, label] of cases) {
  const r = parseLine(input, 20);
  const t = (Number(r.quantity) || 0) * (Number(r.price) || 0);
  let pass =
    r.quantity === exp.quantity &&
    r.unite === exp.unite &&
    r.price === exp.price &&
    Math.abs(t - total) < 0.01;
  if (label !== undefined) pass = pass && r.label === label;
  const shown = input.replace(/\t/g, "\\t");
  if (pass) {
    ok += 1;
    console.log("✓ " + shown);
  } else {
    failures.push(shown);
    console.log("✗ ECHEC | " + shown);
    console.log("   attendu", { ...exp, total, ...(label ? { label } : {}) });
    console.log("   obtenu ", { quantity: r.quantity, unite: r.unite, price: r.price, total: t, label: r.label });
  }
}

console.log(`\n${ok}/${cases.length} OK`);
if (failures.length > 0) process.exit(1);
