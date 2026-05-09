"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type VoiceMode = "short" | "long";

interface VoiceButtonProps {
  onTranscription: (text: string, mode: VoiceMode) => void;
  disabled?: boolean;
}

const TAP_LONG_THRESHOLD_MS = 400;
const SILENCE_TIMEOUT_MS = 2000;
const SILENCE_RMS_THRESHOLD = 0.012;
const SWIPE_CANCEL_PX = 80;
const WAVEFORM_BARS = 5;

export function VoiceButton({
  onTranscription,
  disabled = false,
}: VoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    new Array(WAVEFORM_BARS).fill(0),
  );
  const [swipeArmed, setSwipeArmed] = useState(false);
  const [silenceImminent, setSilenceImminent] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoudAtRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const pressStartXRef = useRef<number>(0);
  const modeRef = useRef<VoiceMode | null>(null);
  const cancelRef = useRef(false);
  const swipeArmedRef = useRef(false);
  const recordingRef = useRef(false);
  const mimeTypeRef = useRef<string>("");

  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (longTimerRef.current) {
      clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch { /* ignore */ }
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      teardown();
      chunksRef.current = [];
    };
  }, [teardown]);

  const transcribe = useCallback(
    async (blob: Blob, finalMode: VoiceMode) => {
      try {
        setTranscribing(true);
        const formData = new FormData();
        const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
        formData.append("audio", blob, `voice.${ext}`);
        const res = await fetch("/api/whisper", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || `Erreur ${res.status}`);
        }
        const { text } = (await res.json()) as { text?: string };
        const trimmed = (text ?? "").trim();
        if (trimmed.length === 0) {
          toast.error("Rien n'a été capté, réessaie.");
          return;
        }
        onTranscription(trimmed, finalMode);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription échouée";
        toast.error(message);
      } finally {
        setTranscribing(false);
      }
    },
    [onTranscription],
  );

  const stopRecording = useCallback(
    (canceled = false) => {
      if (!recordingRef.current) return;
      const recorder = recorderRef.current;
      recordingRef.current = false;
      cancelRef.current = canceled;
      try {
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch { /* ignore */ }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    if (recordingRef.current || transcribing || disabled) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("Micro indisponible sur ce navigateur.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast.error("Enregistrement audio non supporté par ce navigateur.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Autorise l'accès au micro dans les paramètres du navigateur.",
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    cancelRef.current = false;

    const AudioContextCtor =
      window.AudioContext ??
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (AudioContextCtor) {
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
    }

    let mimeType = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }
    }
    mimeTypeRef.current = mimeType || "audio/webm";

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const localMode: VoiceMode = modeRef.current ?? "short";
      const wasCanceled = cancelRef.current;
      const collected = chunksRef.current.slice();
      chunksRef.current = [];

      teardown();
      setRecording(false);
      setMode(null);
      setElapsedMs(0);
      setLevels(new Array(WAVEFORM_BARS).fill(0));
      setSwipeArmed(false);
      setSilenceImminent(false);
      modeRef.current = null;
      swipeArmedRef.current = false;

      if (wasCanceled || collected.length === 0) return;

      const blob = new Blob(collected, {
        type: mimeTypeRef.current || "audio/webm",
      });
      void transcribe(blob, localMode);
    };

    recordingRef.current = true;
    setRecording(true);
    startedAtRef.current = Date.now();
    lastLoudAtRef.current = Date.now();
    setElapsedMs(0);
    setSilenceImminent(false);

    recorder.start(100);

    tickIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (modeRef.current === "short") {
        const silenceFor = Date.now() - lastLoudAtRef.current;
        const remaining = SILENCE_TIMEOUT_MS - silenceFor;
        setSilenceImminent(remaining > 0 && remaining <= 1000);
        if (silenceFor >= SILENCE_TIMEOUT_MS) {
          stopRecording(false);
        }
      }
    }, 100);

    const analyser = analyserRef.current;
    if (analyser) {
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);

        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        if (rms > SILENCE_RMS_THRESHOLD) {
          lastLoudAtRef.current = Date.now();
        }

        const next: number[] = [];
        const slice = Math.floor(buf.length / WAVEFORM_BARS);
        for (let b = 0; b < WAVEFORM_BARS; b++) {
          let peak = 0;
          for (let i = 0; i < slice; i++) {
            const v = Math.abs((buf[b * slice + i] - 128) / 128);
            if (v > peak) peak = v;
          }
          next.push(Math.min(1, peak * 2.2));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [disabled, stopRecording, teardown, transcribe, transcribing]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || transcribing) return;
      if (recordingRef.current && modeRef.current === "short") {
        stopRecording(false);
        return;
      }
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { /* ignore */ }
      pressStartXRef.current = e.clientX;
      modeRef.current = null;
      swipeArmedRef.current = false;
      setMode(null);
      setSwipeArmed(false);
      void startRecording();
      longTimerRef.current = setTimeout(() => {
        if (recordingRef.current && modeRef.current === null) {
          modeRef.current = "long";
          setMode("long");
        }
      }, TAP_LONG_THRESHOLD_MS);
    },
    [disabled, startRecording, stopRecording, transcribing],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!recordingRef.current || modeRef.current !== "long") return;
      const deltaX = e.clientX - pressStartXRef.current;
      const armed = deltaX < -SWIPE_CANCEL_PX;
      if (armed !== swipeArmedRef.current) {
        swipeArmedRef.current = armed;
        setSwipeArmed(armed);
      }
    },
    [],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
      if (longTimerRef.current) {
        clearTimeout(longTimerRef.current);
        longTimerRef.current = null;
      }
      if (!recordingRef.current) return;

      const elapsed = Date.now() - startedAtRef.current;

      if (modeRef.current === "long" || elapsed >= TAP_LONG_THRESHOLD_MS) {
        modeRef.current = "long";
        stopRecording(swipeArmedRef.current);
        return;
      }

      modeRef.current = "short";
      setMode("short");
      lastLoudAtRef.current = Date.now();
    },
    [stopRecording],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
      if (longTimerRef.current) {
        clearTimeout(longTimerRef.current);
        longTimerRef.current = null;
      }
      if (!recordingRef.current) return;
      if (modeRef.current === "long" || modeRef.current === null) {
        stopRecording(true);
      }
    },
    [stopRecording],
  );

  const seconds = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const inLongMode = recording && mode === "long" && !transcribing;
  const inShortMode = recording && mode === "short" && !transcribing;

  const buttonColorCls = swipeArmed
    ? "bg-red-900 text-white"
    : transcribing
      ? "bg-[#534AB7] text-white"
      : recording
        ? silenceImminent
          ? "bg-orange-500 text-white"
          : "bg-red-500 text-white"
        : "bg-transparent text-[#6b7280] hover:bg-[#EEEDFE] hover:text-[#534AB7]";

  return (
    <div className="relative flex flex-col items-start">
      <div className="flex items-center gap-2">
        {inLongMode && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
              swipeArmed ? "text-red-700" : "text-red-500",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">← Glisse pour annuler</span>
          </div>
        )}

        {recording && !transcribing && <Waveform levels={levels} />}

        <button
          type="button"
          aria-label={
            transcribing
              ? "Transcription en cours"
              : recording
                ? "Arrêter l'enregistrement"
                : "Dictée vocale (tap = dicter, maintien = vocal direct)"
          }
          title="Tap = dicter · Maintien = vocal direct"
          disabled={disabled || transcribing}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className={cn(
            "flex flex-shrink-0 items-center justify-center rounded-xl select-none transition-all duration-150 disabled:opacity-50",
            recording ? "h-10 w-10 animate-pulse" : "h-9 w-9",
            buttonColorCls,
          )}
        >
          {transcribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : inShortMode ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      </div>

      {(recording || transcribing) && (
        <p className="mt-1 text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
          {transcribing ? (
            "Transcription…"
          ) : (
            <>
              <span>{`${mm}:${ss}`}</span>
              {inShortMode && !silenceImminent && (
                <span className="ml-1.5">· Tap pour arrêter</span>
              )}
              {silenceImminent && (
                <span className="ml-1.5 text-orange-500">
                  · Silence détecté…
                </span>
              )}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  return (
    <div className="flex h-6 items-center gap-0.5" aria-hidden="true">
      {levels.map((level, i) => {
        const height = Math.max(4, level * 20);
        return (
          <span
            key={i}
            style={{ height: `${height}px` }}
            className="block w-[3px] rounded-full bg-red-500 transition-[height] duration-75"
          />
        );
      })}
    </div>
  );
}
