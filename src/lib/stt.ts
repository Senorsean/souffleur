"use client";

import { LANGUAGES, type LangCode, type Speaker } from "./types";

export type SttStatus = "connecting" | "listening" | "reconnecting" | "error" | "closed";

export interface SttCallbacks {
  /** Text of the turn in progress for this speaker ("" clears it). */
  onInterim(speaker: Speaker, text: string): void;
  /** A finished turn (the speaker paused). */
  onFinal(speaker: Speaker, text: string): void;
  onStatus(speaker: Speaker, status: SttStatus, message?: string): void;
}

export interface SttStream {
  stop(): void;
}

// ---------------------------------------------------------------------------
// Deepgram streaming (nova-3). One WebSocket per audio source, so the
// interviewer (meeting tab) and the candidate (microphone) stay separate.
// ---------------------------------------------------------------------------

const MAX_RECONNECTS = 5;
/** No new words for this long while a turn is open: ask Deepgram to finalize it. */
const SILENCE_FINALIZE_MS = 1500;
/** If Deepgram does not answer the Finalize request, close the turn locally. */
const FINALIZE_GRACE_MS = 800;

async function fetchDeepgramToken(): Promise<string> {
  const res = await fetch("/api/stt/token", { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!res.ok || !data.token) throw new Error(data.error ?? "Jeton Deepgram indisponible.");
  return data.token;
}

function pickMimeType(): string | undefined {
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

/**
 * Re-renders the source through Web Audio with a permanent silent source mixed in.
 * Chrome stops delivering frames when a tab or track goes quiet; without frames
 * Deepgram never hears the pause that ends a sentence. This keeps audio flowing.
 */
function continuousAudio(source: MediaStream): { stream: MediaStream; close: () => void } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const silence = ctx.createConstantSource();
  silence.offset.value = 0;
  silence.connect(dest);
  silence.start();
  const input = ctx.createMediaStreamSource(source);
  input.connect(dest);
  void ctx.resume();
  return {
    stream: dest.stream,
    close: () => {
      input.disconnect();
      silence.stop();
      void ctx.close();
    },
  };
}

export async function startDeepgram(
  media: MediaStream,
  speaker: Speaker,
  language: LangCode,
  cb: SttCallbacks,
): Promise<SttStream> {
  const tracks = media.getAudioTracks();
  if (tracks.length === 0) throw new Error("Aucune piste audio à transcrire.");
  const audio = continuousAudio(new MediaStream(tracks));

  const params = new URLSearchParams({
    model: "nova-3",
    language: LANGUAGES[language].deepgram,
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
    endpointing: "400",
    utterance_end_ms: "1200",
    vad_events: "true",
  });

  let stopped = false;
  let reconnects = 0;
  let ws: WebSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  /** Finalized segments of the current turn. */
  let finalBuffer = "";
  /** Current hypothesis for the segment being spoken (replaced by each interim). */
  let interimText = "";

  const turnText = () => [finalBuffer, interimText].filter(Boolean).join(" ").trim();

  const flush = () => {
    clearTimeout(silenceTimer);
    clearTimeout(graceTimer);
    const text = turnText();
    finalBuffer = "";
    interimText = "";
    cb.onInterim(speaker, "");
    if (text) cb.onFinal(speaker, text);
  };

  /** Watchdog: after a pause with an open turn, force Deepgram to finalize, then close the turn. */
  const armSilenceWatchdog = () => {
    clearTimeout(silenceTimer);
    clearTimeout(graceTimer);
    if (!turnText()) return;
    silenceTimer = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "Finalize" }));
      graceTimer = setTimeout(flush, FINALIZE_GRACE_MS);
    }, SILENCE_FINALIZE_MS);
  };

  const teardown = () => {
    clearInterval(keepAlive);
    clearTimeout(silenceTimer);
    clearTimeout(graceTimer);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder = null;
  };

  const connect = async () => {
    cb.onStatus(speaker, reconnects ? "reconnecting" : "connecting");
    const token = await fetchDeepgramToken();
    if (stopped) return;
    const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["bearer", token]);
    ws = socket;

    socket.onopen = () => {
      reconnects = 0;
      const mimeType = pickMimeType();
      // A fresh recorder per socket: Deepgram needs the container header first.
      recorder = new MediaRecorder(audio.stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(e.data);
      };
      recorder.start(250);
      keepAlive = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "KeepAlive" }));
      }, 8000);
      cb.onStatus(speaker, "listening");
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      let msg: {
        type?: string;
        is_final?: boolean;
        speech_final?: boolean;
        from_finalize?: boolean;
        channel?: { alternatives?: { transcript?: string }[] };
      };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "Results") {
        const text = msg.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
        if (msg.is_final) {
          if (text) finalBuffer = finalBuffer ? `${finalBuffer} ${text}` : text;
          interimText = "";
          if (msg.speech_final || msg.from_finalize) {
            flush();
            return;
          }
        } else if (text) {
          interimText = text;
        }
        if (turnText()) cb.onInterim(speaker, turnText());
        armSilenceWatchdog();
      } else if (msg.type === "UtteranceEnd") {
        if (turnText()) flush();
      }
    };

    socket.onclose = (event) => {
      teardown();
      if (stopped) {
        cb.onStatus(speaker, "closed");
        return;
      }
      flush();
      if (reconnects < MAX_RECONNECTS && tracks.some((t) => t.readyState === "live")) {
        reconnects += 1;
        cb.onStatus(speaker, "reconnecting", `Connexion perdue (${event.code}), reconnexion…`);
        setTimeout(() => {
          connect().catch((err: unknown) =>
            cb.onStatus(speaker, "error", err instanceof Error ? err.message : "Reconnexion impossible."),
          );
        }, 1000 * reconnects);
      } else {
        audio.close();
        cb.onStatus(speaker, "error", event.reason || "Transcription interrompue.");
      }
    };
  };

  try {
    await connect();
  } catch (error) {
    audio.close();
    throw error;
  }

  return {
    stop() {
      stopped = true;
      flush();
      teardown();
      audio.close();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));
        ws.close(1000);
      } else {
        ws?.close();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Browser Web Speech API (free, no key, microphone only, Chrome/Edge/Safari).
// ---------------------------------------------------------------------------

interface WebSpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface WebSpeechEvent {
  resultIndex: number;
  results: { length: number; [index: number]: WebSpeechResult };
}
interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: WebSpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type WebSpeechCtor = new () => WebSpeechRecognition;

export function browserSttSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: WebSpeechCtor; webkitSpeechRecognition?: WebSpeechCtor };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function startBrowserStt(speaker: Speaker, language: LangCode, cb: SttCallbacks): SttStream {
  const w = window as unknown as { SpeechRecognition?: WebSpeechCtor; webkitSpeechRecognition?: WebSpeechCtor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) throw new Error("Reconnaissance vocale non disponible dans ce navigateur. Utilisez Chrome ou Edge.");

  let stopped = false;
  const rec = new Ctor();
  rec.lang = LANGUAGES[language].bcp47;
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const text = result[0].transcript.trim();
      if (result.isFinal) {
        cb.onInterim(speaker, "");
        if (text) cb.onFinal(speaker, text);
      } else {
        interim += `${text} `;
      }
    }
    if (interim.trim()) cb.onInterim(speaker, interim.trim());
  };

  rec.onerror = (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      stopped = true;
      cb.onStatus(speaker, "error", "Accès au micro refusé.");
      return;
    }
    cb.onStatus(speaker, "reconnecting", `Reconnaissance vocale : ${e.error}`);
  };

  // Chrome ends recognition after silences; restart until the user stops.
  rec.onend = () => {
    if (stopped) {
      cb.onStatus(speaker, "closed");
      return;
    }
    try {
      rec.start();
      cb.onStatus(speaker, "listening");
    } catch {
      // start() throws if already started
    }
  };

  rec.start();
  cb.onStatus(speaker, "listening");

  return {
    stop() {
      stopped = true;
      cb.onInterim(speaker, "");
      rec.stop();
    },
  };
}
