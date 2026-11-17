import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Stethoscope } from "lucide-react";
import { Wearable } from "@/components/Wearable";
import {
  getActivePatient,
  pushPrescription,
  todayLocalISO,
  useMediAlert,
} from "@/lib/medialert-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediAlert — Clinician to Wearable Demo" },
      {
        name: "description",
        content:
          "A hospital-linked wearable antibiotic adherence system: a clinician confirms a prescription and it appears instantly on the patient's wearable.",
      },
      { property: "og:title", content: "MediAlert — Clinician to Wearable Demo" },
      {
        property: "og:description",
        content:
          "Prescription pushed straight from clinician to the patient's wearable, with warm reminders and live adherence progress.",
      },
    ],
  }),
  component: Index,
});

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["06:00", "12:00", "18:00", "23:00"],
};

function Index() {
  const s = useMediAlert();
  const [signedIn, setSignedIn] = useState(false);
  const [patientId, setPatientId] = useState(s.patients[0]!.id);
  const [medicine, setMedicine] = useState("Amoxicillin");
  const [dose, setDose] = useState("500 mg");
  const [frequency, setFrequency] = useState(3);
  const [startDate, setStartDate] = useState(todayLocalISO());
  const [durationDays, setDurationDays] = useState(7);
  const [sentAt, setSentAt] = useState<string | null>(null);

  const times = DEFAULT_TIMES[frequency] ?? DEFAULT_TIMES[3]!;
  const patient = s.patients.find((p) => p.id === patientId) ?? getActivePatient(s);

  function confirm() {
    pushPrescription(patientId, { medicine, dose, frequency, times, startDate, durationDays });
    setSentAt(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="gradient-text w-fit text-3xl font-bold tracking-tight">
          Clinician → wearable, in one click
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Confirming a prescription here feeds it straight to the patient's wearable — no pharmacist
          step, no activation code.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <section className="card-lift rise-in rounded-xl border border-border bg-card/90 p-6">
          {!signedIn ? (
            <div className="flex flex-col items-start gap-4 py-10">
              <Stethoscope className="size-8 text-primary" aria-hidden />
              <h2 className="text-xl font-semibold">Hospital sign-in</h2>
              <p className="text-sm text-muted-foreground">Demo only — no real authentication.</p>
              <button
                onClick={() => setSignedIn(true)}
                className="btn-glow rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                Continue as Clinician
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold">New prescription</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Patient">
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  >
                    {s.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} · {p.ward}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Medicine">
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={medicine}
                    onChange={(e) => setMedicine(e.target.value)}
                  />
                </Field>
                <Field label="Dose">
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                  />
                </Field>
                <Field label="Frequency (per day)">
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((f) => (
                      <option key={f} value={f}>
                        {f}× daily
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Start date">
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field label="Duration (days)">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                  />
                </Field>
                <Field label="Reminder times">
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">{times.join(" · ")}</p>
                </Field>
                <Field label="Total doses">
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">
                    {frequency * durationDays}
                  </p>
                </Field>
              </div>

              <button
                onClick={confirm}
                className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
              >
                Confirm and Push to Wearable
              </button>

              {sentAt && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-secondary p-4 animate-fade-in">
                  <CheckCircle2 className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold">Sent to {patient.firstName}'s wearable</p>
                    <p className="text-sm text-muted-foreground">
                      {medicine} {dose}, {frequency}× daily for {durationDays} days · pushed at{" "}
                      {sentAt}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rise-in justify-self-center [animation-delay:150ms]">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Patient wearable
          </h2>
          <Wearable />
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}
