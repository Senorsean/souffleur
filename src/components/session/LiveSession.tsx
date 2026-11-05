"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  ImageUp,
  Keyboard,
  Mic,
  Play,
  RefreshCw,
  Send,
  Square,
  Sparkles,
  StopCircle,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDisplayCapture, getMicrophone, grabFrame, fileToDataUrl, stopStream } from "@/lib/capture";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { errorMessage, isAbort, streamText } from "@/lib/stream";
import { startBrowserStt, startDeepgram, type SttCallbacks, type SttStatus, type SttStream } from "@/lib/stt";
import {
  LANGUAGES,
  MODEL_OPTIONS,
  profileData,
  type AnswerKind,
  type AnswerRequest,
  type ProfileData,
  type Session,
  type Speaker,
  type Utterance,
} from "@/lib/types";
import { Markdown } from "../Markdown";
import { useToast } from "../Toast";
import { Button, cn, formatDuration } from "../ui";
import { Bubble } from "./Bubble";

type Current = {
  key: number;
  kind: AnswerKind;
  question: string;
  text: string;
  streaming: boolean;
  error?: string;
  image?: string;
  savedId?: number;
};

type SourceState = { status: SttStatus; message?: string };

/** Wait this long after the interviewer pauses before treating the turn as complete. */
const MERGE_MS = 900;

const looksLikeQuestion = (text: string) => text.includes("?") || text.split(/\s+/).length >= 4;

function captureError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Autorisation refusée (micro ou partage d'onglet). Réessayez et acceptez la demande du navigateur.";
    if (error.name === "NotFoundError") return "Aucun micro détecté.";
    if (error.name === "NotReadableError") return "Le micro est utilisé par une autre application.";
  }
  return errorMessage(error);
}

const STATUS_LABEL: Record<SttStatus, string> = {
  connecting: "connexion…",
  listening: "écoute",
  reconnecting: "reconnexion…",
  error: "erreur",
  closed: "arrêté",
};

export function LiveSession({ session }: { session: Session & { id: number } }) {
  const id = session.id;
  const toast = useToast();
  const [settings, updateSettings] = useSettings();
  const utterances = useLiveQuery(() => db.utterances.where("sessionId").equals(id).sortBy("at"), [id]);
  const answers = useLiveQuery(() => db.answers.where("sessionId").equals(id).sortBy("at"), [id]);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Partial<Record<Speaker, SourceState>>>({});
  const [interim, setInterim] = useState<Record<Speaker, string>>({ interviewer: "", me: "" });
  const [pendingText, setPendingText] = useState("");
  const [current, setCurrent] = useState<Current | null>(null);
  const [manual, setManual] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const enginesRef = useRef<SttStream[]>([]);
  const displayRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const pendingRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const profileRef = useRef<ProfileData | null>(null);
  const utterancesRef = useRef<Utterance[]>([]);
  const settingsRef = useRef(settings);
  const sessionRef = useRef(session);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    utterancesRef.current = utterances ?? [];
  }, [utterances]);
  useEffect(() => {
    db.profile.get("me").then((p) => {
      profileRef.current = p ? profileData(p) : null;
    });
  }, []);

  // ---- answers --------------------------------------------------------------

  const runStream = useCallback(
    async (kind: AnswerKind, question: string, url: string, body: unknown, image?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const key = Date.now();
      setCurrent({ key, kind, question, text: "", streaming: true, image });
      try {
        const full = await streamText(
          url,
          body,
          (text) => setCurrent((c) => (c && c.key === key ? { ...c, text } : c)),
          controller.signal,
        );
        const savedId = await db.answers.add({
          sessionId: id,
          question,
          answer: full,
          kind,
          model: settingsRef.current.model,
          at: Date.now(),
        });
        setCurrent((c) => (c && c.key === key ? { ...c, text: full, streaming: false, savedId } : c));
      } catch (e) {
        if (isAbort(e)) return;
        setCurrent((c) => (c && c.key === key ? { ...c, streaming: false, error: errorMessage(e) } : c));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [id],
  );

  const askAnswer = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q) return;
      const s = settingsRef.current;
      const sess = sessionRef.current;
      const body: AnswerRequest = {
        model: s.model,
        language: sess.language,
        length: s.answerLength,
        tone: s.tone,
        profile: profileRef.current,
        job: { company: sess.company, role: sess.role, jobDescription: sess.jobDescription, notes: sess.notes },
        transcript: utterancesRef.current.slice(-24).map((u) => ({ speaker: u.speaker, text: u.text })),
        question: q,
      };
      void runStream("answer", q, "/api/answer", body);
    },
    [runStream],
  );

  /** Commits the buffered interviewer turn to the transcript; optionally auto-answers it. */
  const flushPending = useCallback(
    (allowAuto: boolean) => {
      clearTimeout(timerRef.current);
      const text = pendingRef.current.trim();
      pendingRef.current = "";
      setPendingText("");
      if (!text) return "";
      void db.utterances.add({ sessionId: id, speaker: "interviewer", text, at: Date.now() });
      if (allowAuto && settingsRef.current.autoAnswer && looksLikeQuestion(text)) askAnswer(text);
      return text;
    },
    [id, askAnswer],
  );
  const flushRef = useRef(flushPending);
  useEffect(() => {
    flushRef.current = flushPending;
  }, [flushPending]);

  const callbacks: SttCallbacks = useMemo(
    () => ({
      onInterim(speaker, text) {
        setInterim((prev) => (prev[speaker] === text ? prev : { ...prev, [speaker]: text }));
        // The interviewer is still talking: wait before answering.
        if (text && speaker === "interviewer") clearTimeout(timerRef.current);
      },
      onFinal(speaker, text) {
        if (speaker === "me") {
          if (pendingRef.current) flushRef.current(true);
          void db.utterances.add({ sessionId: id, speaker, text, at: Date.now() });
          return;
        }
        pendingRef.current = pendingRef.current ? `${pendingRef.current} ${text}` : text;
        setPendingText(pendingRef.current);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flushRef.current(true), MERGE_MS);
      },
      onStatus(speaker, status, message) {
        setSources((prev) => ({ ...prev, [speaker]: { status, message } }));
      },
    }),
    [id],
  );

  // ---- capture --------------------------------------------------------------

  const stopCapture = useCallback(() => {
    enginesRef.current.forEach((e) => e.stop());
    enginesRef.current = [];
    stopStream(displayRef.current);
    displayRef.current = null;
    stopStream(micRef.current);
    micRef.current = null;
    stopStream(screenRef.current);
    screenRef.current = null;
    setRunning(false);
    setSources({});
    setInterim({ interviewer: "", me: "" });
  }, []);

  async function start() {
    if (starting || running) return;
    setStarting(true);
    setError(null);
    const s = sessionRef.current;
    enginesRef.current = [];
    try {
      const p = await db.profile.get("me");
      profileRef.current = p ? profileData(p) : null;

      if (s.sttProvider === "deepgram") {
        if (s.audioMode !== "mic") {
          const display = await getDisplayCapture(true);
          if (display.getAudioTracks().length === 0) {
            stopStream(display);
            throw new Error(
              "Aucun son partagé. Relancez, choisissez l'onglet de la visio et cochez « Partager l'audio de l'onglet ».",
            );
          }
          displayRef.current = display;
          display.getTracks().forEach((t) =>
            t.addEventListener("ended", () => {
              if (displayRef.current === display) {
                flushRef.current(false);
                stopCapture();
                toast("Partage d'onglet arrêté : écoute en pause.", "error");
              }
            }),
          );
        }
        if (s.audioMode !== "tab") micRef.current = await getMicrophone();
        if (displayRef.current) {
          enginesRef.current.push(await startDeepgram(displayRef.current, "interviewer", s.language, callbacks));
        }
        if (micRef.current) {
          const speaker: Speaker = s.audioMode === "mic" ? "interviewer" : "me";
          enginesRef.current.push(await startDeepgram(micRef.current, speaker, s.language, callbacks));
        }
      } else {
        enginesRef.current.push(startBrowserStt("interviewer", s.language, callbacks));
      }

      await db.sessions.update(id, { status: "live", startedAt: s.startedAt ?? Date.now() });
      setRunning(true);
    } catch (e) {
      stopCapture();
      setError(captureError(e));
    } finally {
      setStarting(false);
    }
  }

  function pause() {
    stopCapture();
    flushRef.current(false);
  }

  async function end() {
    stopCapture();
    flushRef.current(false);
    abortRef.current?.abort();
    await db.sessions.update(id, {
      status: "ended",
      endedAt: Date.now(),
      startedAt: sessionRef.current.startedAt ?? Date.now(),
    });
  }

  useEffect(
    () => () => {
      stopCapture();
      abortRef.current?.abort();
      clearTimeout(timerRef.current);
    },
    [stopCapture],
  );

  // ---- actions ---------------------------------------------------------------

  const answerLatest = useCallback(() => {
    const pending = flushRef.current(false);
    const last = [...utterancesRef.current].reverse().find((u) => u.speaker === "interviewer")?.text ?? "";
    const question = pending || last;
    if (!question) {
      toast("Aucune question détectée pour l'instant. Tapez-la dans le champ ci-dessous.", "error");
      return;
    }
    askAnswer(question);
  }, [askAnswer, toast]);

  const analyzeScreen = useCallback(
    async (file?: File) => {
      setError(null);
      try {
        let image: string;
        if (file) {
          image = await fileToDataUrl(file);
        } else {
          let stream = [displayRef.current, screenRef.current].find((s) =>
            s?.getVideoTracks().some((t) => t.readyState === "live"),
          );
          if (!stream) {
            stream = await getDisplayCapture(false);
            screenRef.current = stream;
          }
          image = await grabFrame(stream);
        }
        const s = settingsRef.current;
        const sess = sessionRef.current;
        const note = manual.trim();
        setManual("");
        void runStream(
          "code",
          note || "Analyse de l'écran",
          "/api/screen",
          { model: s.model, language: sess.language, image, question: note, job: { company: sess.company, role: sess.role } },
          image,
        );
      } catch (e) {
        setError(captureError(e));
      }
    },
    [manual, runStream],
  );

  function sendManual() {
    const q = manual.trim();
    if (!q) return;
    setManual("");
    void db.utterances.add({ sessionId: id, speaker: "interviewer", text: q, at: Date.now() });
    askAnswer(q);
  }

  // Keyboard shortcuts (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey)) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        answerLatest();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        void analyzeScreen();
      } else if (e.key === "Escape") {
        abortRef.current?.abort();
        setCurrent((c) => (c && c.streaming ? { ...c, streaming: false, error: "Interrompu." } : c));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answerLatest, analyzeScreen]);

  // Clock.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Auto-scroll the transcript.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [utterances?.length, interim.interviewer, interim.me, pendingText]);

  // ---- render ----------------------------------------------------------------

  const latestSaved = answers?.at(-1);
  const display: Current | null =
    current ??
    (latestSaved
      ? {
          key: latestSaved.id ?? 0,
          kind: latestSaved.kind,
          question: latestSaved.question,
          text: latestSaved.answer,
          streaming: false,
          savedId: latestSaved.id,
        }
      : null);
  const history = (answers ?? []).filter((a) => a.id !== display?.savedId).reverse();
  const interviewerLive = [pendingText, interim.interviewer].filter(Boolean).join(" ");
  const elapsed = session.startedAt ? (running ? now : (session.endedAt ?? Date.now())) - session.startedAt : 0;
  const modelLabel = MODEL_OPTIONS.find((m) => m.id === settings.model)?.label ?? settings.model;

  const regenerate = () => {
    if (!display) return;
    if (display.kind === "answer") askAnswer(display.question);
    else void analyzeScreen();
  };

  return (
    <div className="flex h-dvh flex-col bg-ink-950 text-stone-100">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-ink-800 px-4 py-3">
        <Link href="/app/sessions" className="rounded-lg p-2 text-stone-400 hover:bg-ink-800 hover:text-stone-100" aria-label="Retour">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold">{session.title}</h1>
          <p className="text-xs text-stone-500">
            {LANGUAGES[session.language].label} · {session.sttProvider === "deepgram" ? "Deepgram" : "Navigateur"} · {modelLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {(Object.entries(sources) as [Speaker, SourceState][]).map(([speaker, st]) => (
            <span
              key={speaker}
              title={st.message}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1",
                st.status === "listening" && "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
                (st.status === "connecting" || st.status === "reconnecting") && "bg-spot-400/10 text-spot-200 ring-spot-400/30",
                st.status === "error" && "bg-red-500/10 text-red-300 ring-red-500/30",
                st.status === "closed" && "bg-ink-800 text-stone-400 ring-ink-700",
              )}
            >
              <span className={cn("size-1.5 rounded-full bg-current", st.status === "listening" && "live-dot")} />
              {speaker === "interviewer" ? "Recruteur" : "Moi"} : {STATUS_LABEL[st.status]}
            </span>
          ))}
        </div>

        <span className="font-mono text-sm tabular-nums text-stone-400">{formatDuration(elapsed)}</span>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-300">
          <input
            type="checkbox"
            className="size-4 accent-spot-400"
            checked={settings.autoAnswer}
            onChange={(e) => updateSettings({ autoAnswer: e.target.checked })}
          />
          Réponse auto
        </label>

        {running ? (
          <Button size="sm" variant="dark" onClick={pause}>
            <Square className="size-3.5" /> Pause
          </Button>
        ) : (
          <Button size="sm" variant="spot" onClick={start} loading={starting}>
            <Play className="size-3.5" /> {session.status === "live" ? "Reprendre l'écoute" : "Démarrer l'écoute"}
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={end}>
          <StopCircle className="size-3.5" /> Terminer
        </Button>
      </header>

      {error && (
        <div role="alert" className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!running && (utterances?.length ?? 0) === 0 && !display && (
        <div className="border-b border-ink-800 bg-ink-900 px-4 py-4 text-sm text-stone-300">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6">
            <Mic className="size-6 text-spot-300" />
            <ol className="flex flex-1 flex-wrap gap-x-6 gap-y-1">
              {session.audioMode !== "mic" ? (
                <>
                  <li>1. Ouvrez la visio dans un onglet Chrome ou Edge.</li>
                  <li>2. « Démarrer l&apos;écoute », choisissez cet onglet, cochez « Partager l&apos;audio ».</li>
                </>
              ) : (
                <li>1. « Démarrer l&apos;écoute » et autorisez le micro.</li>
              )}
              <li>Les réponses apparaissent à droite dès qu&apos;une question est détectée.</li>
            </ol>
            <Button variant="spot" onClick={start} loading={starting}>
              <Play className="size-4" /> Démarrer l&apos;écoute
            </Button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Transcript */}
        <section className="flex min-h-[40vh] flex-col overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-ink-800 lg:min-h-0">
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
            <h2 className="text-sm font-medium text-stone-300">Transcription</h2>
            <span className="text-xs text-stone-500">{utterances?.length ?? 0} échanges</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {(utterances ?? []).map((u) => (
              <Bubble
                key={u.id}
                speaker={u.speaker}
                text={u.text}
                onAnswer={u.speaker === "interviewer" ? () => askAnswer(u.text) : undefined}
              />
            ))}
            {interviewerLive && <Bubble speaker="interviewer" text={interviewerLive} live />}
            {interim.me && <Bubble speaker="me" text={interim.me} live />}
            {running && !utterances?.length && !interviewerLive && !interim.me && (
              <p className="pt-10 text-center text-sm text-stone-500">À l&apos;écoute… parlez ou attendez la première question.</p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        {/* Answer */}
        <section className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-[40vh] flex-1 flex-col overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-spot-400/20 lg:min-h-0">
            <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-3">
              <Sparkles className="size-4 shrink-0 text-spot-300" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-spot-300">
                  {display?.kind === "code" ? "Analyse d'écran" : "Réponse suggérée"}
                  {display?.streaming && <span className="ml-2 normal-case tracking-normal text-stone-500">génération…</span>}
                </p>
                {display && <p className="truncate text-sm text-stone-400">« {display.question} »</p>}
              </div>
              {display && !display.streaming && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-stone-400 hover:bg-ink-800 hover:text-stone-100"
                    onClick={() => {
                      void navigator.clipboard.writeText(display.text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    aria-label="Copier la réponse"
                  >
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-stone-400 hover:bg-ink-800 hover:text-stone-100"
                    onClick={regenerate}
                    aria-label="Régénérer"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </>
              )}
              {display?.streaming && (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-ink-800"
                  onClick={() => abortRef.current?.abort()}
                >
                  Arrêter (Échap)
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
              {display ? (
                <>
                  {display.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={display.image} alt="Capture analysée" className="mb-4 max-h-40 rounded-lg ring-1 ring-ink-700" />
                  )}
                  {display.text ? (
                    <Markdown dark className="prose-base lg:prose-lg">
                      {display.text}
                    </Markdown>
                  ) : (
                    display.streaming && (
                      <div className="flex gap-1.5 pt-2">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="size-2 animate-bounce rounded-full bg-spot-300" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                      </div>
                    )
                  )}
                  {display.error && <p className="mt-3 text-sm text-red-300">{display.error}</p>}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-stone-500">
                  <Wand2 className="mb-3 size-8 text-ink-600" />
                  <p className="text-sm">Les réponses suggérées s&apos;affichent ici.</p>
                  <p className="mt-1 max-w-sm text-xs">
                    Elles s&apos;appuient sur votre profil et l&apos;offre. Relisez-les et reformulez avec vos mots.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="rounded-2xl bg-ink-900 p-3 ring-1 ring-ink-800">
            <textarea
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendManual();
                }
              }}
              rows={2}
              placeholder="Tapez une question (⌘/Ctrl + Entrée) ou une précision pour l'analyse d'écran…"
              className="w-full resize-none rounded-lg bg-ink-950 px-3 py-2 text-sm text-stone-100 ring-1 ring-ink-700 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-spot-400"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="spot" onClick={sendManual} disabled={!manual.trim()}>
                <Send className="size-3.5" /> Répondre
              </Button>
              <Button
                size="sm"
                variant="dark"
                onClick={answerLatest}
              >
                <Sparkles className="size-3.5" /> Dernière question
              </Button>
              <Button
                size="sm"
                variant="dark"
                onClick={() => void analyzeScreen()}
              >
                <Camera className="size-3.5" /> Analyser l&apos;écran
              </Button>
              <Button
                size="sm"
                variant="darkGhost"
                onClick={() => fileRef.current?.click()}
              >
                <ImageUp className="size-3.5" /> Image
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void analyzeScreen(f);
                }}
              />
              <span className="ml-auto hidden items-center gap-1.5 text-xs text-stone-500 md:inline-flex">
                <Keyboard className="size-3.5" /> Espace : répondre · S : écran · Échap : stop
              </span>
            </div>
          </div>

          {history.length > 0 && (
            <details className="rounded-2xl bg-ink-900 ring-1 ring-ink-800">
              <summary className="cursor-pointer px-4 py-2.5 text-sm text-stone-300">Réponses précédentes ({history.length})</summary>
              <div className="max-h-72 space-y-4 overflow-y-auto px-4 pb-4">
                {history.map((a) => (
                  <div key={a.id} className="border-t border-ink-800 pt-3">
                    <p className="mb-1 text-xs text-stone-500">« {a.question} »</p>
                    <Markdown dark>{a.answer}</Markdown>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
