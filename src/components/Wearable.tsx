import { useEffect, useMemo, useState } from "react";
import {
  getActivePatient,
  logDose,
  openAdvisor,
  progressOf,
  resetWearable,
  snoozeReminder,
  triggerReminder,
  useMediAlert,
} from "@/lib/medialert-store";
import {
  Battery,
  Bell,
  BellOff,
  Check,
  Clock,
  Flame,
  HeartPulse,
  Lock,
  Mic,
  PartyPopper,
  Pill,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { FREE_QUESTION_LIMIT, useVoiceAdvisor } from "@/hooks/use-voice-advisor";

function Buddy({ className = "" }: { className?: string }) {
  return (
    <div className={`grid size-10 place-items-center rounded-full bg-accent ${className}`}>
      <HeartPulse className="size-5 text-accent-foreground" aria-hidden />
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16" role="img" aria-label={`${pct}% of doses taken`}>
      <circle cx="32" cy="32" r={r} className="fill-none stroke-watch-chip" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className="fill-none stroke-primary transition-all duration-500"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        className="fill-watch-foreground text-[14px] font-semibold"
      >
        {pct}%
      </text>
    </svg>
  );
}

/** Consecutive taken doses ending at the most recent logged dose. */
function streakOf(patient: ReturnType<typeof getActivePatient>) {
  let streak = 0;
  for (let i = patient.doses.length - 1; i >= 0; i--) {
    const d = patient.doses[i]!;
    if (d.status === "pending") continue;
    if (d.status === "taken") streak++;
    else break;
  }
  return streak;
}

export function Wearable() {
  const s = useMediAlert();
  const patient = getActivePatient(s);
  const prog = progressOf(patient);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const hasRx = !!patient.prescription;
  const streak = useMemo(() => streakOf(patient), [patient]);

  // Next pending dose today (or the first pending dose in the course).
  const nextDose = patient.doses.find((d) => d.status === "pending") ?? null;
  const nextDoseIn = useMemo(() => {
    if (!nextDose || !now) return null;
    const [h, m] = nextDose.time.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h!, m!, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return "due now";
    const mins = Math.round(diffMs / 60000);
    return mins >= 60 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : `in ${mins} min`;
  }, [nextDose, now]);

  // Today's dose strip (current day of the course).
  const todaysDoses = patient.doses.filter((d) => d.day === prog.dayOf);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="watch-float watch-glow rounded-[3rem] bg-watch-body p-3 shadow-watch">
        <div className="watch-sheen flex h-[340px] w-[300px] flex-col overflow-hidden rounded-[2.25rem] bg-watch-screen p-5 text-watch-foreground">
          {s.wearableState === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 animate-fade-in">
              <div className="flex w-full items-center justify-between text-[11px] text-watch-muted">
                <span className="flex items-center gap-1">
                  <Battery className="size-3" aria-hidden /> 82%
                </span>
                {streak > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame className="size-3 text-primary" aria-hidden /> {streak} in a row
                  </span>
                )}
              </div>
              <p className="text-5xl font-semibold tabular-nums tracking-tight">{clock}</p>
              <p className="text-sm text-watch-muted">
                {now
                  ? now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })
                  : ""}
              </p>
              {hasRx && nextDose && (
                <p className="flex items-center gap-1 rounded-full bg-watch-chip px-3 py-1 text-xs">
                  <Bell className="size-3" aria-hidden /> Next dose {nextDose.time}
                  {nextDoseIn ? ` · ${nextDoseIn}` : ""}
                </p>
              )}
              <Buddy className="mt-1" />
              <p className="text-sm text-watch-muted">
                {hasRx
                  ? `${patient.firstName} · ${prog.taken} of ${prog.total} doses`
                  : "No schedule yet"}
              </p>
              {hasRx && todaysDoses.length > 0 && (
                <div className="mt-1 w-full">
                  <p className="mb-1 text-center text-[11px] uppercase tracking-wide text-watch-muted">
                    Today
                  </p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {todaysDoses.map((d) => (
                      <span
                        key={d.id}
                        className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                          d.status === "taken"
                            ? "bg-primary text-primary-foreground"
                            : d.status === "pending"
                              ? "bg-watch-chip"
                              : "bg-muted text-muted-foreground line-through"
                        }`}
                      >
                        {d.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {s.wearableState === "updated" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center animate-scale-in">
              <Buddy />
              <p className="text-lg font-semibold">New prescription received</p>
              <p className="text-sm text-watch-muted">
                {patient.firstName}, your schedule is ready — {patient.prescription?.medicine}{" "}
                {patient.prescription?.dose}, {patient.prescription?.frequency}× daily for{" "}
                {patient.prescription?.durationDays} days.
              </p>
              <button
                onClick={resetWearable}
                className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Got it
              </button>
            </div>
          )}

          {s.wearableState === "reminder" && (
            <div className="flex flex-1 flex-col justify-between animate-fade-in">
              <div className="flex items-center justify-between text-sm text-watch-muted">
                <span className="flex items-center gap-1">
                  <Clock className="size-4" aria-hidden /> {clock}
                </span>
                {streak > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <Flame className="size-3 text-primary" aria-hidden /> {streak}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-center">
                <Buddy className="mx-auto pulse" />
                <p className="text-lg font-semibold leading-snug">{s.lastMessage}</p>
                <p className="flex items-center justify-center gap-1 text-sm text-watch-muted">
                  <Pill className="size-4" aria-hidden />
                  {patient.prescription?.medicine} {patient.prescription?.dose}
                </p>
                <p className="text-xs text-watch-muted">
                  Day {prog.dayOf} of {patient.prescription?.durationDays} — you're on track
                </p>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <WatchBtn
                    onClick={() => logDose("taken")}
                    tone="primary"
                    icon={<Check className="size-4" />}
                    label="Taken"
                  />
                  <WatchBtn
                    onClick={() => logDose("delayed")}
                    icon={<Clock className="size-4" />}
                    label="Delayed"
                  />
                  <WatchBtn
                    onClick={() => logDose("skipped")}
                    icon={<SkipForward className="size-4" />}
                    label="Skipped"
                  />
                  <WatchBtn
                    onClick={() => logDose("missed")}
                    icon={<X className="size-4" />}
                    label="Missed"
                  />
                </div>
                <button
                  onClick={snoozeReminder}
                  className="flex w-full items-center justify-center gap-1 rounded-xl bg-watch-chip px-2 py-1.5 text-xs font-medium transition-transform active:scale-95"
                >
                  <BellOff className="size-3" aria-hidden /> Snooze — remind me again shortly
                </button>
              </div>
            </div>
          )}

          {s.wearableState === "logged" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center animate-scale-in">
              <div
                className={`grid size-14 place-items-center rounded-full ${
                  s.lastLogged === "taken"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                } pulse`}
              >
                {s.lastLogged === "taken" ? (
                  <Check className="size-7" />
                ) : (
                  <HeartPulse className="size-7" />
                )}
              </div>
              <p className="text-base font-semibold leading-snug">{s.lastMessage}</p>
              <Ring pct={prog.pct} />
              <p className="text-sm text-watch-muted">
                {prog.taken} of {prog.total} doses · Day {prog.dayOf} of{" "}
                {patient.prescription?.durationDays}
              </p>
              {streak > 1 && (
                <p className="flex items-center gap-1 text-xs text-watch-muted">
                  <Flame className="size-3 text-primary" aria-hidden /> {streak} doses in a row
                </p>
              )}
              <button
                onClick={resetWearable}
                className="btn-glow rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Back to watch face
              </button>
            </div>
          )}

          {s.wearableState === "advisor" && <AdvisorScreen />}

          {s.wearableState === "complete" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-celebrate text-center animate-scale-in">
              <PartyPopper className="size-10 text-primary pulse" aria-hidden />
              <p className="text-xl font-bold leading-tight">
                Course complete, {patient.firstName}!
              </p>
              <p className="text-sm text-watch-muted">
                You finished all {prog.total} doses of {patient.prescription?.medicine}. That's the
                whole course — beautifully done.
              </p>
              <Ring pct={prog.pct} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={triggerReminder}
          disabled={!hasRx || prog.complete}
          className="btn-glow rounded-md border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Trigger next reminder
        </button>
        <button
          onClick={openAdvisor}
          className="btn-glow flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          <Mic className="size-4" aria-hidden /> Ask AI Doctor
        </button>
        <button
          onClick={resetWearable}
          className="btn-glow rounded-md border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          Show watch face
        </button>
      </div>
    </div>
  );
}

function WatchBtn({
  onClick,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: "primary";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold transition-transform active:scale-95 ${
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : "bg-watch-chip text-watch-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

const T = {
  en: {
    idle: "Tap the mic and ask",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    error: "Something went wrong",
    freeLeft: (n: number, max: number) => `${n} of ${max} free left`,
    unlimited: "Unlimited",
    usedTitle: "Free questions used",
    usedBody: (n: number) =>
      `You've asked ${n} questions. Upgrade to keep talking to the AI Doctor.`,
    upgrade: "Upgrade (demo — no charge)",
    back: "Back to watch face",
    close: "Close",
    unsupported: "Voice isn't supported in this browser. Use Chrome or Edge.",
  },
  sw: {
    idle: "Gusa maikrofoni uulize",
    listening: "Inasikiliza…",
    thinking: "Inafikiri…",
    speaking: "Inaongea…",
    error: "Hitilafu imetokea",
    freeLeft: (n: number, max: number) => `Maswali ${n} kati ya ${max} yamebaki`,
    unlimited: "Bila kikomo",
    usedTitle: "Maswali ya bure yameisha",
    usedBody: (n: number) =>
      `Umeuliza maswali ${n}. Boresha ili uendelee kuzungumza na Daktari wa AI.`,
    upgrade: "Boresha (onyesho — hakuna malipo)",
    back: "Rudi kwenye saa",
    close: "Funga",
    unsupported: "Sauti haitumiki kwenye kivinjari hiki. Tumia Chrome au Edge.",
  },
} as const;

function AdvisorScreen() {
  const st = useMediAlert();
  const patient = getActivePatient(st);
  const rx = patient.prescription;
  const context = rx
    ? `${patient.firstName} takes ${rx.medicine} ${rx.dose}, ${rx.frequency} times daily for ${rx.durationDays} days.`
    : "";
  const a = useVoiceAdvisor(context);
  const t = T[a.lang];
  const busy = a.phase === "listening" || a.phase === "thinking" || a.phase === "speaking";

  const close = () => {
    a.stopAll();
    resetWearable();
  };

  if (a.locked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center animate-scale-in">
        <Lock className="size-8 text-primary" aria-hidden />
        <p className="text-base font-semibold">{t.usedTitle}</p>
        <p className="text-xs text-watch-muted">{t.usedBody(FREE_QUESTION_LIMIT)}</p>
        <button
          onClick={a.unlock}
          className="btn-glow rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t.upgrade}
        </button>
        <button onClick={close} className="text-xs text-watch-muted underline">
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between animate-fade-in">
      <div className="flex items-center justify-between text-[11px] text-watch-muted">
        <span className="flex items-center gap-1">
          {(["en", "sw"] as const).map((l) => (
            <button
              key={l}
              onClick={() => a.setLang(l)}
              aria-pressed={a.lang === l}
              aria-label={l === "en" ? "English" : "Kiswahili"}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                a.lang === l ? "bg-primary text-primary-foreground" : "bg-watch-chip"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </span>
        <span>{a.unlocked ? t.unlimited : t.freeLeft(a.remaining, FREE_QUESTION_LIMIT)}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-2 text-center" aria-live="polite">
        {!a.supported && <p className="text-xs text-watch-muted">{t.unsupported}</p>}
        {(a.phase === "listening" || a.phase === "speaking") && (
          <div className="flex h-8 items-center justify-center gap-1" aria-hidden>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.11}s` }} />
            ))}
          </div>
        )}
        {a.transcript && <p className="text-sm font-medium leading-snug">“{a.transcript}”</p>}
        {a.answer && (
          <p className="rounded-xl bg-watch-chip p-2 text-left text-xs leading-snug">{a.answer}</p>
        )}
        {a.error && <p className="text-xs text-destructive">{a.error}</p>}
        {!a.transcript && !a.answer && !a.error && (
          <p className="pt-6 text-sm text-watch-muted">{t[a.phase]}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={close} className="text-xs text-watch-muted underline">
          {t.close}
        </button>
        <button
          onClick={busy ? a.stopAll : a.startListening}
          disabled={!a.supported}
          aria-label={busy ? "Stop" : "Ask a question"}
          className={`grid size-12 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 ${
            a.phase === "listening" ? "mic-ripple" : ""
          }`}
        >
          {busy ? <Square className="size-5" /> : <Mic className="size-5" />}
        </button>
        <span className="w-10 text-right text-[11px] text-watch-muted">
          {a.phase === "idle" || a.phase === "error" ? "" : t[a.phase]}
        </span>
      </div>
    </div>
  );
}
