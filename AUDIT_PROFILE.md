# Audit — Source de vérité unique du profil + statut TVA

Date : 2026-06-03 · Branche : `main`

Objectif : garantir que **toutes** les infos émetteur (statut TVA, SIRET, forme
juridique, adresse, nom commercial, assurances décennale + RC pro, IBAN/BIC,
téléphone, email pro, immatriculation) proviennent d'**une seule source — la
table `profiles`** — et corriger le traitement du statut TVA de bout en bout.

---

## 1. Source de vérité — état par endroit

| Endroit | Fichier | Verdict |
|---|---|---|
| Schéma profil | `supabase/migrations/20260516_profiles_settings_complete.sql` | **OK** — colonnes canoniques (vat_status, siret, legal_status, iban/bic, decennale_*, rc_pro_*, registration_*…). |
| Prompt système Émile | `lib/emile/system-prompt.ts` | **Corrigé** — statut TVA lu du profil + nouveau bloc TVA conditionnel (voir §2). |
| Tools Émile | `lib/emile/tools.ts` | **OK** — `getUserProfile`/`checkProfileCompleteness`/`refreshProfile` lisent `profiles`. Aucune valeur entreprise en dur. `calculateTVA` gère déjà la franchise. |
| Route chat Émile | `app/api/emile/chat/route.ts` | **OK** — `vat_status`/`tva_status` lus du profil et passés au prompt. |
| Panneau / chat | `components/emile/EmileChat.tsx` | **OK** — message `[SYSTEM]` interne à Émile, lit `profile.vat_status`. Pas de donnée en dur. |
| Template PDF | `lib/pdf/quote-template.tsx` | **Corrigé** — fallback « Assujetti TVA » + alignement total TTC (voir §2, §4). |
| Mentions légales PDF | `lib/pdf/mentions-legales.ts` | **Corrigé** — bug critique de mapping du statut TVA (voir §2). |
| Page `/sign/[token]` | `app/sign/[token]/page.tsx` | **Corrigé** — lit le snapshot émetteur quand le devis est envoyé (voir §3). |
| Route PDF | `app/api/quotes/[id]/pdf/route.ts` | **Corrigé** — draft = live, sent = snapshot (voir §3). |
| Envoi devis | `lib/quotes/send.ts` | **Corrigé** — fige le snapshot émetteur à l'envoi (voir §3). |
| Email transactionnel | `emails/QuoteEmail.tsx` | **OK** — infos émetteur lues du profil, pas de mention TVA en dur. Le PDF joint utilise le profil live au moment de l'envoi (= snapshot). |
| Onboarding / EntrepriseForm / Modale | `app/dashboard/onboarding/page.tsx`, `components/dashboard/EntrepriseForm.tsx`, `components/emile/ProfileCompletionModal.tsx` | **OK** — écrivent les valeurs canoniques `auto_entrepreneur` / `assujetti` / `non_assujetti`. |
| Dashboard / navbar | `components/shared/Navbar.tsx` | **OK** — aucune donnée profil en dur. |

**Aucune valeur entreprise hardcodée** (SIRET, nom, adresse, IBAN, n° d'assurance)
trouvée dans le code. Les seules constantes sont : couleurs de marque par défaut,
taux de TVA français valides `[0, 2.1, 5.5, 10, 20]`, et les données de la
plateforme Quovi elle-même (`lib/legal-info.ts`) — sans rapport avec le profil
artisan.

---

## 2. Fix critique — statut TVA

**Bug trouvé.** Les valeurs réellement stockées dans `profiles.vat_status` sont
`auto_entrepreneur` / `assujetti` / `non_assujetti` (écrites par l'onboarding,
EntrepriseForm et ProfileCompletionModal). Or `resolveMentionsLegales` testait
`vatStatus === "auto_entrepreneur_franchise" || vatStatus === "franchise"` —
**des valeurs jamais écrites en base**. Conséquence : pour un auto-entrepreneur,
`tvaNote` était **toujours `null`**, donc :
- le PDF tombait sur le fallback **« Assujetti TVA »** (faux) ;
- la mention **« TVA non applicable, art. 293 B du CGI » n'apparaissait jamais**
  (PDF ni page de signature).

**Corrigé** dans `lib/pdf/mentions-legales.ts` :
- nouveaux ensembles canoniques `VAT_FRANCHISE` / `VAT_NON_ASSUJETTI` / `VAT_SUBJECT`
  (+ alias hérités tolérés) ;
- helpers exportés `resolveTvaNote()` et `isVatSubject()` (source de vérité unique) ;
- `franchise/auto-entrepreneur → « TVA non applicable, art. 293 B du CGI »`,
  `non assujetti → « TVA non applicable »`, `assujetti → aucune mention`.

**Corrigé** dans `lib/pdf/quote-template.tsx` (`LegalMentions`) : le fallback
« Assujetti TVA » ne s'affiche plus que si le profil est **réellement assujetti**
(`isVatSubject`) ou possède un n° de TVA ; sinon aucune ligne TVA n'est imprimée.

**Corrigé** dans `lib/emile/system-prompt.ts` : bloc « RÈGLES DE TVA » désormais
**conditionnel au statut réel**. Pour un statut exonéré, Émile :
- force `tauxTVA: 0` sur **toutes** les lignes,
- ne pose **jamais** la question du taux (pas de quick replies TVA),
- rappelle la mention légale adéquate,
- HT = TTC, aucun calcul de TVA.

La page `/sign/[token]` consomme déjà `resolveMentionsLegales` → bénéficie
automatiquement du correctif.

---

## 3. Règle métier — brouillon (live) vs envoyé (snapshot)

**Avant.** Le PDF et la page de signature relisaient toujours le profil **live**.
Modifier son profil après envoi changeait rétroactivement un devis déjà transmis.

**Corrigé.**
- Migration `supabase/migrations/20260603_quotes_emitter_snapshot.sql` :
  nouvelle colonne `quotes.emitter_snapshot JSONB`.
- `lib/quotes/send.ts` : à l'envoi, on persiste le profil **exact** utilisé pour
  le PDF (best-effort, requête séparée — l'absence de colonne ne casse pas l'envoi).
- `app/api/quotes/[id]/pdf/route.ts` & `app/sign/[token]/page.tsx` :
  - `status === 'draft'` → profil **LIVE** ;
  - `status !== 'draft'` → **snapshot figé** (lecture défensive, séparée).

Résultat : un brouillon reflète les éditions de profil en temps réel ; un devis
envoyé/signé reste immuable.

---

## 4. Fix mineur — alignement « TOTAL TTC » dans le PDF

`react-pdf` n'expose pas `white-space: nowrap` (absent du type `Style`). Le
montant cassait au milieu (ex. « 12 345,67 € » réparti sur plusieurs lignes dans
la carte totaux étroite) car `formatEuros` groupait les milliers avec des espaces
ASCII, coupables de césure.

**Corrigé** dans `lib/pdf/quote-template.tsx` : `formatEuros` utilise désormais
l'espace **insécable U+00A0** (présent dans l'encodage WinAnsi de Helvetica/Courier,
même largeur, jamais coupé) pour le groupement des milliers **et** la liaison avec
le « € ». Le montant reste d'un seul tenant — correctif appliqué à tous les
montants du PDF, total TTC inclus.

---

## 5. Non touché (conformément à la consigne)

- Logique de cap quota / sécurité (déjà durcie).
- Layout général du PDF (les alertes ESLint préexistantes sur les `<Image alt>`
  et apostrophes du bloc signature ne sont **pas** liées à cet audit).
- Aucune nouvelle dépendance npm.

---

## Vérifications

- `npx tsc --noEmit` : **OK** (aucune erreur).
- `npx eslint` sur les fichiers modifiés : aucune **nouvelle** alerte introduite
  (les 4 alertes restantes sont préexistantes dans le template PDF).
