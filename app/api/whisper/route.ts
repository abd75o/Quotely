import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

const VOCAB_PROMPT =
  "Conversation entre un artisan et son assistant pour créer un devis. " +
  "Vocabulaire technique : carrelage, parpaing, IPN, BA13, plâtrerie, plomberie, " +
  "électricité, peinture, isolation, toiture, charpente, maçonnerie, chape, dépose, " +
  "fourniture, pose, rénovation, neuf, particulier, professionnel.";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form data
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "Champ 'audio' manquant ou invalide" },
      { status: 400 },
    );
  }

  // 3. Size check
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 25 Mo)" },
      { status: 413 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json(
      { error: "Fichier audio vide" },
      { status: 400 },
    );
  }

  // 4. Whisper API
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configuration serveur manquante" },
      { status: 500 },
    );
  }

  const isDev = process.env.NODE_ENV !== "production";

  try {
    const openai = new OpenAI({ apiKey });

    // The OpenAI SDK accepts a File-like object with a name + type.
    const audioName =
      (audio instanceof File && audio.name) || "audio.webm";
    const audioType = audio.type || "audio/webm";
    const file = new File([audio], audioName, { type: audioType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "fr",
      prompt: VOCAB_PROMPT,
    });

    return NextResponse.json({ text: transcription.text ?? "" });
  } catch (err) {
    console.error("Whisper transcription error:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      {
        error: isDev
          ? `Whisper: ${message}`
          : "La transcription a échoué. Réessaie dans un instant.",
      },
      { status: 500 },
    );
  }
}
