"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["click", "scroll", "keydown", "mousemove"] as const;

export function SessionManager() {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const lastEventThrottleRef = useRef<number>(0);
  const isAuthedRef = useRef<boolean>(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      isAuthedRef.current = !!session;
    }
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      isAuthedRef.current = !!session;
      if (session) {
        lastActivityRef.current = Date.now();
      }
    });

    function onActivity() {
      if (!isAuthedRef.current) return;
      const now = Date.now();
      if (now - lastEventThrottleRef.current < ACTIVITY_THROTTLE_MS) return;
      lastEventThrottleRef.current = now;

      const idleMs = now - lastActivityRef.current;
      lastActivityRef.current = now;

      if (idleMs > REFRESH_AFTER_MS && idleMs <= INACTIVITY_LIMIT_MS) {
        supabase.auth.refreshSession().catch(() => {
          /* silent — onAuthStateChange will fire if it fails */
        });
      }
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    const interval = window.setInterval(async () => {
      if (!isAuthedRef.current) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= INACTIVITY_LIMIT_MS) {
        try {
          await supabase.auth.signOut();
        } finally {
          isAuthedRef.current = false;
          router.push("/?session=expired");
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearInterval(interval);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [router]);

  return null;
}
