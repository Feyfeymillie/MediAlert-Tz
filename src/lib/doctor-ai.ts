import { createServerFn } from "@tanstack/react-start";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type AdvisorLang = "en" | "sw";

export type AskDoctorResult = { ok: true; reply: string } | { ok: false; error: string };

const MODEL = "openai/gpt-oss-20b";
const MAX_MESSAGES = 10;
const MAX_CHARS = 500;

const SYSTEM_PROMPT = `You are MediAlert's AI health advisor on a smartwatch. You are NOT a real doctor and cannot diagnose or prescribe.
Rules:
- Answer in at most 2 short sentences (under 45 words total). Plain spoken language, no lists, no markdown.
- Give general, safe guidance about medicines, side effects, adherence and when to see a clinician.
- Never tell the user to stop, skip or change a prescribed dose; tell them to ask their clinician or pharmacist.
- If the question suggests an emergency (trouble breathing, swelling of face/throat, chest pain, severe rash, fainting), tell them to seek urgent medical care right now.
`;

const LANG_RULE: Record<AdvisorLang, string> = {
  en: "Reply in English.",
  sw: "Jibu kwa Kiswahili sanifu rahisi pekee (Reply ONLY in simple, natural Swahili).",
};

/** Free-tier LLM call (Groq, OpenAI-compatible). The API key stays on the server. */
export const askDoctor = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: ChatMsg[]; context?: string; lang?: AdvisorLang }) => ({
    lang: d.lang === "sw" ? ("sw" as const) : ("en" as const),
    messages: (Array.isArray(d.messages) ? d.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m): ChatMsg => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) })),
    context: typeof d.context === "string" ? d.context.slice(0, 300) : "",
  }))
  .handler(async ({ data }): Promise<AskDoctorResult> => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) {
      return { ok: false, error: "GROQ_API_KEY is not set. Add it to .env.local and restart." };
    }
    if (data.messages.length === 0) return { ok: false, error: "No question received." };

    const base = `${SYSTEM_PROMPT}\n${LANG_RULE[data.lang]}`;
    const system = data.context
      ? `${base}\nPatient context (from the clinician's prescription): ${data.context}`
      : base;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          reasoning_effort: "low",
          max_tokens: 400,
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          error:
            res.status === 429
              ? "The free AI quota is busy. Try again soon."
              : `AI error ${res.status}`,
        };
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = json.choices?.[0]?.message?.content?.trim();
      return reply ? { ok: true, reply } : { ok: false, error: "Empty AI reply." };
    } catch {
      return { ok: false, error: "Could not reach the AI service." };
    }
  });
