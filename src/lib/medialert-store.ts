import { useSyncExternalStore } from "react";

export type DoseStatus = "pending" | "taken" | "delayed" | "skipped" | "missed";

export type Dose = {
  id: string;
  /** Day index starting at 1 */
  day: number;
  time: string;
  status: DoseStatus;
};

export type Prescription = {
  medicine: string;
  dose: string;
  frequency: number;
  times: string[];
  startDate: string;
  durationDays: number;
  pushedAt: string;
};

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  ward: string;
  prescription: Prescription | null;
  doses: Dose[];
};

export type WearableState = "idle" | "updated" | "reminder" | "logged" | "complete";

type State = {
  patients: Patient[];
  activePatientId: string;
  wearableState: WearableState;
  lastMessage: string;
  lastLogged: DoseStatus | null;
};

function buildDoses(times: string[], durationDays: number): Dose[] {
  const doses: Dose[] = [];
  for (let d = 1; d <= durationDays; d++) {
    times.forEach((t, i) => {
      doses.push({ id: `d${d}-${i}`, day: d, time: t, status: "pending" });
    });
  }
  return doses;
}

function seedPatient(
  id: string,
  firstName: string,
  lastName: string,
  age: number,
  ward: string,
  rx: Omit<Prescription, "pushedAt"> | null,
  takenCount = 0,
  missedCount = 0,
): Patient {
  if (!rx) return { id, firstName, lastName, age, ward, prescription: null, doses: [] };
  const doses = buildDoses(rx.times, rx.durationDays);
  for (let i = 0; i < takenCount && i < doses.length; i++) doses[i]!.status = "taken";
  for (let i = takenCount; i < takenCount + missedCount && i < doses.length; i++)
    doses[i]!.status = "missed";
  return {
    id,
    firstName,
    lastName,
    age,
    ward,
    prescription: { ...rx, pushedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    doses,
  };
}

const state: State = {
  activePatientId: "p1",
  wearableState: "idle",
  lastMessage: "",
  lastLogged: null,
  patients: [
    seedPatient("p1", "Amina", "Juma", 34, "Outpatient A", null),
    seedPatient(
      "p2",
      "Joseph",
      "Mbwana",
      52,
      "Ward 3",
      {
        medicine: "Amoxicillin",
        dose: "500 mg",
        frequency: 3,
        times: ["08:00", "14:00", "20:00"],
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: 7,
      },
      13,
      2,
    ),
    seedPatient(
      "p3",
      "Neema",
      "Kileo",
      27,
      "Outpatient B",
      {
        medicine: "Doxycycline",
        dose: "100 mg",
        frequency: 2,
        times: ["09:00", "21:00"],
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: 5,
      },
      9,
      0,
    ),
    seedPatient(
      "p4",
      "Hassan",
      "Ally",
      61,
      "Ward 1",
      {
        medicine: "Ciprofloxacin",
        dose: "250 mg",
        frequency: 2,
        times: ["07:00", "19:00"],
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: 7,
      },
      4,
      3,
    ),
  ],
};

const listeners = new Set<() => void>();
let snapshot: State = { ...state };

function emit() {
  snapshot = { ...state, patients: [...state.patients] };
  listeners.forEach((l) => l());
}

export function useMediAlert() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );
}

export function getActivePatient(s: State) {
  return s.patients.find((p) => p.id === s.activePatientId) ?? s.patients[0]!;
}

export function setActivePatient(id: string) {
  state.activePatientId = id;
  state.wearableState = getActivePatient(state).prescription ? "idle" : "idle";
  emit();
}

export function pushPrescription(patientId: string, rx: Omit<Prescription, "pushedAt">) {
  const p = state.patients.find((x) => x.id === patientId);
  if (!p) return;
  p.prescription = { ...rx, pushedAt: new Date().toISOString() };
  p.doses = buildDoses(rx.times, rx.durationDays);
  state.activePatientId = patientId;
  state.wearableState = "updated";
  state.lastMessage = "";
  state.lastLogged = null;
  emit();
}

const REMINDERS = [
  (n: string) => `Time for your dose, ${n} — you've got this.`,
  (n: string) => `Quick one, ${n} — your next dose is up.`,
  () => `Almost there — one more for now.`,
  (n: string) => `Hey ${n}, a small step keeps you on track.`,
  () => `Your dose is ready when you are.`,
  (n: string) => `${n}, this one's for feeling better sooner.`,
];

export function triggerReminder() {
  const p = getActivePatient(state);
  if (!p.prescription) return;
  const pick = REMINDERS[Math.floor(Math.random() * REMINDERS.length)]!;
  state.lastMessage = pick(p.firstName);
  state.wearableState = "reminder";
  emit();
}

export function snoozeReminder() {
  const p = getActivePatient(state);
  if (!p.prescription) return;
  state.wearableState = "idle";
  state.lastMessage = `Snoozed — we'll nudge you again shortly, ${p.firstName}.`;
  emit();
  // Simulated snooze: re-prompt after a few seconds in the demo.
  setTimeout(() => {
    const stillPending = p.doses.some((d) => d.status === "pending");
    if (stillPending) {
      state.lastMessage = `Gentle nudge, ${p.firstName} — your dose is still waiting.`;
      state.wearableState = "reminder";
      emit();
    }
  }, 5000);
}

const AFFIRM = [
  (n: string) => `Nice one, ${n}.`,
  () => `Logged — that's another step done.`,
  (n: string) => `Well done, ${n}. Keep going.`,
  () => `Good job — see you at the next one.`,
];

export const SAFE_GUIDANCE =
  "This dose was marked as missed. If you're not sure what to do next, check your label or reach out to your clinician.";

export function logDose(status: Exclude<DoseStatus, "pending">) {
  const p = getActivePatient(state);
  const next = p.doses.find((d) => d.status === "pending");
  if (!next) return;
  next.status = status;
  state.lastLogged = status;
  if (status === "taken") {
    const a = AFFIRM[Math.floor(Math.random() * AFFIRM.length)]!;
    state.lastMessage = a(p.firstName);
  } else {
    state.lastMessage = SAFE_GUIDANCE;
  }
  const remaining = p.doses.some((d) => d.status === "pending");
  state.wearableState = remaining ? "logged" : "complete";
  emit();
}

export function resetWearable() {
  state.wearableState = getActivePatient(state).prescription ? "idle" : "idle";
  emit();
}

export function progressOf(p: Patient) {
  const total = p.doses.length;
  const taken = p.doses.filter((d) => d.status === "taken").length;
  const missed = p.doses.filter((d) => d.status === "missed" || d.status === "skipped").length;
  const logged = p.doses.filter((d) => d.status !== "pending").length;
  const dayOf = p.prescription
    ? Math.min(p.prescription.durationDays, Math.floor(logged / Math.max(1, p.prescription.frequency)) + 1)
    : 0;
  return {
    total,
    taken,
    missed,
    logged,
    dayOf,
    pct: total ? Math.round((taken / total) * 100) : 0,
    complete: total > 0 && logged === total,
  };
}
