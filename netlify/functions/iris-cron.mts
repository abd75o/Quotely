// Netlify Scheduled Function — déclenche le moteur de relance Iris 1×/jour.
//
// Volontairement minimal : ce fichier ne contient AUCUNE logique métier. Il ne
// fait qu'appeler l'endpoint protégé /api/iris/cron (qui, lui, fait tout le
// travail dans l'app Next : lecture Supabase, emails Resend, notif Émile).
// Ainsi on peut changer de déclencheur (pg_cron, cron externe) sans toucher au
// moteur.
//
// Planning : tous les jours à 07:00 UTC (≈ 8h/9h Paris selon saison).
// Variables Netlify requises : NEXT_PUBLIC_APP_URL (ou URL fournie par Netlify)
// et CRON_SECRET (identique à celle de l'app).

const handler = async () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || "";
  const secret = process.env.CRON_SECRET || "";

  if (!base || !secret) {
    console.error(
      "[iris-cron] NEXT_PUBLIC_APP_URL ou CRON_SECRET manquant — abandon.",
    );
    return new Response("Missing config", { status: 500 });
  }

  try {
    const res = await fetch(`${base}/api/iris/cron`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    console.log(`[iris-cron] ${res.status} — ${text.slice(0, 500)}`);
    return new Response(text, { status: res.status });
  } catch (e) {
    console.error("[iris-cron] échec de l'appel /api/iris/cron", e);
    return new Response("Trigger failed", { status: 502 });
  }
};

export default handler;

export const config = {
  schedule: "0 7 * * *",
};
