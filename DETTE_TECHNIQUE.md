# Dette technique — chantiers futurs

> Registre des dettes identifiées mais volontairement non traitées sur le moment.
> Chaque entrée = un chantier futur, avec le contexte, le risque et une piste de résolution.
> **Ne pas traiter sans décision explicite** — ces points sont connus et assumés.

---

## D1 — Double colonne `vat_status` / `tva_status` pour le même concept

- **Date d'identification :** 2026-07-05
- **Statut :** à traiter — dette, pas un bug actif
- **Fichiers concernés :**
  - `app/api/emile/chat/route.ts:91` — lecture avec fallback `vat_status || tva_status`
  - `lib/emile/tools.ts:36` (`tva_status?` dans le contexte) et `:250` (`if (!p.vat_status && !p.tva_status)`)
  - Table `profiles` (Supabase)

**Problème.** Le statut TVA de l'artisan existe dans **deux colonnes** : `vat_status` (canonique, actuelle) et `tva_status` (héritée). Le code lit défensivement les deux (`vat_status || tva_status`), donc rien ne casse aujourd'hui.

**Risque.** Deux champs pour une même donnée = source de divergence future : un code qui n'écrirait/lirait qu'une seule des deux colonnes réintroduirait une incohérence de statut TVA (exactement le type de bug corrigé le 2026-07-05 sur `calculateTVA`).

**Piste de résolution.** Migration Supabase : consolider sur `vat_status` (backfill depuis `tva_status` là où `vat_status` est vide), puis supprimer `tva_status` et le fallback dans le code. À coordonner avec l'onboarding / EntrepriseForm / ProfileCompletionModal qui écrivent le statut.

---

## D2 — Colonne TVA non masquée dans le PDF pour un artisan exonéré (AE / non-assujetti)

- **Date d'identification :** 2026-07-05
- **Statut :** cosmétique — report assumé
- **Fichier concerné :** `lib/pdf/quote-template.tsx` (`LineItemsTable`, `TotalsBlock`)

**Problème.** Pour un artisan en franchise en base (`auto_entrepreneur`) ou non-assujetti, le PDF affiche toujours une colonne « TVA » à 0 % et un « Total TTC », alors que ces notions n'ont pas de sens pour lui. La mention légale d'exonération (293 B / « TVA non applicable ») est bien présente — c'est donc **correct juridiquement**, juste **inélégant**.

**Travail déjà prototypé.** Une version de ce masquage (colonne TVA retirée + largeurs redistribuées + « Total » au lieu de « Total TTC ») existe sur la branche `backup/windows-tva` (commit `40eb081`). À réappliquer **par-dessus la version actuelle du Mac** (ne pas restaurer le fichier entier : la logique de mention footer du Mac est meilleure), en s'appuyant sur le helper `isVatExempt` de `lib/pdf/mentions-legales.ts`.

**Risque.** Nul (cosmétique). Priorité basse.

---

## D3 — Listes de métiers divergentes entre modules

- **Date d'identification :** début de chantier « packs métiers » (2026-07-05)
- **Statut :** à traiter — dette, pas un bug actif

**Problème.** Plusieurs modules maintiennent leur propre liste/mapping de métiers, qui peuvent diverger (mentions légales par métier, mapping des packs, etc.). Même schéma de risque que la dette TVA : sans source unique, les listes finissent par ne plus être alignées.

**Piste de résolution.** Centraliser la liste canonique des métiers + leurs mappings dans un module unique importé partout, sur le modèle de ce qui a été fait pour le statut TVA (`isVatExempt` / `resolveTvaNote` dans `lib/pdf/mentions-legales.ts` comme source de vérité unique).
