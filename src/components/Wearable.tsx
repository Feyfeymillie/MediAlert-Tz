import { useEffect, useState } from "react";
import {
  getActivePatient,
  logDose,
  progressOf,
  resetWearable,
  triggerReminder,
  useMediAlert,
} from "@/lib/medialert-store";
import { Check, Clock, HeartPulse, PartyPopper, Pill, SkipForward, X } from "lucide-react";

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
      <text x="32" y="37" textAnchor="middle" className="fill-watch-foreground text-[14px] font-semibold">
        {pct}%
      </text>
    </svg>
  );
}

export function Wearable() {
  const s = useMediAlert();
  const patient = getActivePatient(s);
  const prog = progressOf(patient);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasRx = !!patient.prescription;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-[3rem] bg-watch-body p-3 shadow-watch">
        <div className="flex h-[340px] w-[300px] flex-col overflow-hidden rounded-[2.25rem] bg-watch-screen p-5 text-watch-foreground">
          {s.wearableState === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 animate-fade-in">
              <p className="text-6xl font-semibold tabular-nums tracking-tight">{clock}</p>
              <p className="text-sm text-watch-muted">
                {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <Buddy className="mt-2" />
              <p className="text-sm text-watch-muted">
                {hasRx ? `${patient.firstName} · ${prog.taken} of ${prog.total} doses` : "No schedule yet"}
              </p>
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
              <div className="flex items-center gap-2 text-sm text-watch-muted">
                <Clock className="size-4" aria-hidden /> {clock}
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
              <div className="grid grid-cols-2 gap-2">
                <WatchBtn onClick={() => logDose("taken")} tone="primary" icon={<Check className="size-4" />} label="Taken" />
                <WatchBtn onClick={() => logDose("delayed")} icon={<Clock className="size-4" />} label="Delayed" />
                <WatchBtn onClick={() => logDose("skipped")} icon={<SkipForward className="size-4" />} label="Skipped" />
                <WatchBtn onClick={() => logDose("missed")} icon={<X className="size-4" />} label="Missed" />
              </div>
            </div>
          )}

          {s.wearableState === "logged" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center animate-scale-in">
              <div
                className={`grid size-14 place-items-center rounded-full ${
                  s.lastLogged === "taken" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                } pulse`}
              >
                {s.lastLogged === "taken" ? <Check className="size-7" /> : <HeartPulse className="size-7" />}
              </div>
              <p className="text-base font-semibold leading-snug">{s.lastMessage}</p>
              <Ring pct={prog.pct} />
              <p className="text-sm text-watch-muted">
                {prog.taken} of {prog.total} doses · Day {prog.dayOf} of {patient.prescription?.durationDays}
              </p>
              <button
                onClick={resetWearable}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Back to watch face
              </button>
            </div>
          )}

          {s.wearableState === "complete" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-celebrate text-center animate-scale-in">
              <PartyPopper className="size-10 text-primary pulse" aria-hidden />
              <p className="text-xl font-bold leading-tight">Course complete, {patient.firstName}!</p>
              <p className="text-sm text-watch-muted">
                You finished all {prog.total} doses of {patient.prescription?.medicine}. That's the whole
                course — beautifully done.
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
          className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Trigger next reminder
        </button>
        <button
          onClick={resetWearable}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          Show watch face
        </button>
      </div>
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Simulated device. Reminders are triggered manually for the demo.
      </p>
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
