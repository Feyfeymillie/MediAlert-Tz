# Med-Link Connect

Build Prompt:MediAlert— Hospital-Linked Wearable Adherence System (Prototype)

Build a clickable web prototype that demonstrates a hospital-sold, wearable-linked antibiotic adherence system. This is a demo/prototype only — simulate the wearable, the hospital API, and notifications. No real hardware, no real backend integration, no real push notifications.

The concept to demonstrate (in plain terms)

A doctor prescribes medicine inside the existing hospital system (today this just gets printed and walked to the pharmacy).

Our system links doctor directly → a low-cost wearable the patient already owns (bought once from the hospital in bulk). No pharmacist step in this flow — the moment the doctor confirms the prescription in the system, it is automatically pushed straight to the patient's wearable.

At every hospital visit, the patient's wearable is automatically refreshed with the new prescription and reminders turn back on — no manual activation code needed at this stage; the link is doctor-confirms → wearable-updates.

The wearable shows time + friendly, varied reminders designed to feel like something the patient looks forward to, not a nagging alarm.

Build two connected views to show this whole loop working end to end.

Views to build

1. Hospital/Clinician view (web/desktop style)

Sign-in — simple "Continue as Clinician" button.

Prescription entry — medicine name, dose, frequency, times, start date, duration.

Confirm & Send — a single "Confirm and Push to Wearable" button. This is the one moment that matters: confirming here is what automatically feeds the prescription straight to the patient's wearable — no code, no pharmacist, no separate activation step.

Confirmation screen — a simple success state: "Sent to [patient]'s wearable" with a timestamp, so the clinician has visible proof the push happened.

2. Wearable view — build this as a small, round or rectangular watch-face-style mockup (a fixed-size div styled like a smartwatch screen), separate from the clinician view

Idle/time state — just shows the current time, clean and minimal, like a real watch face. This is the default state most of the time.

Auto-updated state — the instant the clinician clicks "Confirm and Push to Wearable," this screen automatically updates (no patient action required) to show "New prescription received — your schedule is ready," making the doctor-to-wearable automation visible in the demo.

Reminder state — a friendly animated notification appears on the watch face at the scheduled time (simulate with a demo button "Trigger next reminder" so you don't need real timers for the demo).

Dose logged state — big, simple Taken / Delayed / Skipped / Missed buttons/taps, with an immediate warm micro-animation or color change on tap.

Progress state — small progress ring or bar plus "3 of 21 doses" style text.

Course complete state — a celebratory animation/message when the last dose is logged.

Notification design — this is the part to spend real design effort on

Do NOT use a single repeated robotic reminder line. Build in:

Rotating, warm micro-copy — cycle between at least 4–5 different friendly phrasings for the same reminder (e.g. "Time for your dose — you've got this," "Quick one — your 2pm dose is up," "Almost there, one more for now"). Pick one at random each time the demo reminder fires.

Bounded streak framing — "Day 4 of 7 — you're on track" rather than a plain checklist, with a clear finish line (not an infinite streak).

Instant positive feedback on every log — a short animation/color pulse and a short affirming message the moment a dose is marked taken.

Personalization — use the patient's first name in reminders and progress text.

A simple recurring visual character/icon on the watch face tied to reminders and completion, so it feels like a consistent little presence rather than a generic alert icon.

A strong, warm "course complete" moment — this should feel like the best screen in the whole demo, since it's the payoff.

Hard rule: never frame a missed/skipped dose as failure. Keep the tone supportive, matching this microcopy: "This dose was marked as missed. If you're not sure what to do next, check your label or reach out to your clinician."

Data/logic to simulate

Generate a mock dose schedule from frequency + start date + duration, same as before.

Progress = doses logged as taken / total doses; update the ring/bar live as the demo taps through dose states.

Simulate the doctor→wearable push directly: when the clinician clicks "Confirm and Push to Wearable," update shared app state so the wearable view re-renders automatically with the new prescription — no code entry step anywhere in this flow, to make the "no pharmacist involved, fully automatic" link visually obvious in the demo even though it's just local state, not a real API.

No real diagnosis, no real dose/schedule changes triggered by missed/skipped/delayed status — status changes only ever surface the same safe, supportive guidance message.

Tech constraints (for a build finishing by ~8am)

Single front-end project (e.g. React), all views in one app, switchable via simple navigation/tabs — no real backend, no real database, no real auth.

Keep the wearable view visually distinct (small fixed frame, rounded corners, watch-like proportions) so it's obviously representing a separate device in screenshots/demo, even though it's running in the same browser tab.

Use shared local/component state to pass prescription data directly from the clinician view to the wearable view the instant "Confirm and Push to Wearable" is clicked — this is enough to demonstrate the concept; do not attempt real API/backend work overnight.

Style: calm, high-contrast, large text, icon + text for every status (never color alone).

What to explicitly label as "future/production, not built tonight" (say this out loud in the demo)

Real wearable hardware and firmware

Real hospital information system (HIS) / EMR API integration

Real authentication and per-patient data security

Real push notifications and Bluetooth/network sync to an actual device

Real per-visit billing/activation-fee logic

Deliverable

A two-screen-flow clickable demo: clinician confirms a prescription and it is pushed automatically (no pharmacist, no code) straight to the wearable view → wearable shows time, the auto-update moment, a warm rotating reminder, dose logging with instant positive feedback, live progress, and a celebratory course-complete state. Total demo should run in about two minutes and clearly state it's a conceptual prototype, not production hardware or a real hospital integration.

we also want a clinician dashboard that shows the progress of their patients..

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2b6b876e-e81b-4e14-8a87-0632d7b9f085).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
