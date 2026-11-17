import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, CircleDashed, Watch } from "lucide-react";
import { progressOf, setActivePatient, useMediAlert } from "@/lib/medialert-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Patient Adherence Dashboard — MediAlert" },
      {
        name: "description",
        content:
          "Clinician dashboard showing each patient's antibiotic course progress, doses taken and missed, in the MediAlert wearable app.",
      },
      { property: "og:title", content: "Patient Adherence Dashboard — MediAlert" },
      {
        property: "og:description",
        content: "Track every patient's course progress, doses taken and missed, at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useMediAlert();
  const active = s.patients.filter((p) => p.prescription);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Patient adherence</h1>
      <p className="mt-2 text-muted-foreground">
        Progress updates live as doses are logged on the wearable.
      </p>

      <div className="mt-8 grid gap-4">
        {s.patients.map((p) => {
          const prog = progressOf(p);
          return (
            <article key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {p.firstName} {p.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {p.age} yrs · {p.ward} ·{" "}
                    {p.prescription
                      ? `${p.prescription.medicine} ${p.prescription.dose}, ${p.prescription.frequency}× daily for ${p.prescription.durationDays} days`
                      : "No active prescription"}
                  </p>
                </div>
                <button
                  onClick={() => setActivePatient(p.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
                >
                  <Watch className="size-4" aria-hidden />
                  {s.activePatientId === p.id ? "Showing on wearable" : "View on wearable"}
                </button>
              </div>

              {p.prescription && (
                <>
                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden /> {prog.taken} of{" "}
                      {prog.total} doses taken
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle className="size-4 text-accent-foreground" aria-hidden />{" "}
                      {prog.missed} missed or skipped
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CircleDashed className="size-4" aria-hidden /> Day {prog.dayOf} of{" "}
                      {p.prescription.durationDays}
                      {prog.complete ? " · course complete" : ""}
                    </span>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {active.length} of {s.patients.length} patients on an active course. Missed doses are never
        framed as failure — patients only see supportive guidance.
      </p>
    </div>
  );
}
