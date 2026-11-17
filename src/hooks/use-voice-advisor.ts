import { useCallback, useEffect, useRef, useState } from "react";
import { askDoctor, type AdvisorLang, type ChatMsg } from "@/lib/doctor-ai";

export const FREE_QUESTION_LIMIT = 5;
const STORAGE_KEY = "medialert.advisor.v1";
const LANG_KEY = "medialert.advisor.lang";
const SPEECH_LANG: Record<AdvisorLang, string> = { en: "en-US", sw: "sw-KE" };
const SYNTH_LANG: Record<AdvisorLang, string> = { en: "en-US", sw: "sw-TZ" };

const ERRORS = {
  en: {
    blocked: "Microphone blocked. Allow mic access in the browser.",
    noSpeech: "I didn't hear anything. Tap the mic and try again.",
    voice: "Voice error",
  },
  sw: {
    blocked: "Maikrofoni imezuiwa. Ruhusu maikrofoni kwenye kivinjari.",
    noSpeech: "Sikusikia chochote. Gusa maikrofoni ujaribu tena.",
    voice: "Hitilafu ya sauti",
  },
} as const;

export type AdvisorPhase = "idle" | "listening" | "thinking" | "speaking" | "error";

type Usage = { used: number; unlocked: boolean };

// Minimal typings for the (prefixed) Web Speech API.
type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function loadUsage(): Usage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Usage>;
      return { used: Number(p.used) || 0, unlocked: !!p.unlocked };
    }
  } catch {
    /* storage unavailable */
  }
  return { used: 0, unlocked: false };
}

function saveUsage(u: Usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Siri-style voice advisor: listen (SpeechRecognition) -> ask free LLM -> speak (speechSynthesis).
 * Free users get FREE_QUESTION_LIMIT questions; the unlock is a simulated prototype paywall.
 */
export function useVoiceAdvisor(context: string) {
  const [phase, setPhase] = useState<AdvisorPhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<Usage>({ used: 0, unlocked: false });
  const [supported, setSupported] = useState(true);
  const [lang, setLangState] = useState<AdvisorLang>("en");
  const langRef = useRef<AdvisorLang>("en");

  const recRef = useRef<Recognition | null>(null);
  const historyRef = useRef<ChatMsg[]>([]);
  const usageRef = useRef(usage);
  usageRef.current = usage;

  useEffect(() => {
    setUsage(loadUsage());
    try {
      if (localStorage.getItem(LANG_KEY) === "sw") {
        langRef.current = "sw";
        setLangState("sw");
      }
    } catch {
      /* storage unavailable */
    }
    setSupported(!!getRecognitionCtor() && "speechSynthesis" in window);
    return () => {
      recRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const remaining = usage.unlocked ? Infinity : Math.max(0, FREE_QUESTION_LIMIT - usage.used);
  const locked = remaining === 0;

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const want = SYNTH_LANG[langRef.current];
    u.lang = want;
    const voice = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(want.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    u.onend = () => setPhase("idle");
    u.onerror = () => setPhase("idle");
    setPhase("speaking");
    synth.speak(u);
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) {
        setPhase("idle");
        return;
      }
      setPhase("thinking");
      setError("");
      const messages: ChatMsg[] = [...historyRef.current, { role: "user", content: q }];
      const res = await askDoctor({ data: { messages, context, lang: langRef.current } });
      if (!res.ok) {
        setError(res.error);
        setPhase("error");
        return;
      }
      const reply: ChatMsg = { role: "assistant", content: res.reply };
      historyRef.current = [...messages, reply].slice(-10);
      const next = { ...usageRef.current, used: usageRef.current.used + 1 };
      setUsage(next);
      saveUsage(next);
      setAnswer(res.reply);
      speak(res.reply);
    },
    [context, speak],
  );

  const startListening = useCallback(() => {
    if (usageRef.current.used >= FREE_QUESTION_LIMIT && !usageRef.current.unlocked) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    setTranscript("");
    setAnswer("");
    setError("");

    const rec = new Ctor();
    rec.lang = SPEECH_LANG[langRef.current];
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let failed = false;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      failed = true;
      const t = ERRORS[langRef.current];
      setError(
        e.error === "not-allowed"
          ? t.blocked
          : e.error === "no-speech"
            ? t.noSpeech
            : `${t.voice}: ${e.error}`,
      );
      setPhase("error");
    };
    rec.onend = () => {
      if (failed) return;
      void ask(finalText);
    };
    recRef.current = rec;
    setPhase("listening");
    rec.start();
  }, [ask]);

  const setLang = useCallback((l: AdvisorLang) => {
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
    langRef.current = l;
    setLangState(l);
    setPhase("idle");
    setTranscript("");
    setAnswer("");
    setError("");
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const stopListening = useCallback(() => recRef.current?.stop(), []);

  const stopAll = useCallback(() => {
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
    setPhase("idle");
  }, []);

  /** Simulated "payment": prototype only, no real charge. */
  const unlock = useCallback(() => {
    const next = { ...usageRef.current, unlocked: true };
    setUsage(next);
    saveUsage(next);
  }, []);

  /** Demo helper: reset the free quota. */
  const resetQuota = useCallback(() => {
    const next = { used: 0, unlocked: false };
    setUsage(next);
    saveUsage(next);
    historyRef.current = [];
  }, []);

  return {
    phase,
    transcript,
    answer,
    error,
    supported,
    lang,
    setLang,
    remaining,
    locked,
    unlocked: usage.unlocked,
    startListening,
    stopListening,
    stopAll,
    unlock,
    resetQuota,
  };
}
