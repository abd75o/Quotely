"use client";

import { useEffect, useState } from "react";
import { ChatBot } from "./ChatBot";

export function ChatBotWrapper() {
  const [metier, setMetier] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("metier")
        .single()
        .then(({ data }) => {
          setMetier(data?.metier ?? undefined);
          setReady(true);
        });
    });
  }, []);

  if (!ready) return null;
  return <ChatBot metier={metier} />;
}
