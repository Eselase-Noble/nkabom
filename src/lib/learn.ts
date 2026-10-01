import { db } from "@/lib/db";
import { normalizeGhPhone } from "@/lib/phone";

// ---------------------------------------------------------------------------
// Nkabom's learning loop. Every checked message is a data point: we mine it
// into (1) community memory (numbers that appear in scams), (2) an online
// keyword model (terms weighted by how often they appear in scam vs safe
// messages), and (3) a retrieval set of recent scams used as AI context.
// Nothing here retrains a model — it is incremental, online learning from the
// request stream.
// ---------------------------------------------------------------------------

export type Label = "scam" | "safe";

export interface LearnedContext {
  recentScams: string[]; // short snippets of recently confirmed scams (RAG)
  learnedTerms: { term: string; weight: number }[]; // online-learned signals
  flaggedNumbers: string[]; // numbers the community has reported
}

const STOPWORDS = new Set(
  "the a an and or to of in on for your you we is it are be this that with have has will now not no yes if then from at as your you'r they them i me my our can your".split(
    " ",
  ),
);

// Pull candidate signal terms out of a message: informative words + any phone
// numbers (as whole tokens).
export function tokenize(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  const words = lower
    .replace(/[^a-z0-9₵+\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOPWORDS.has(w) && !/^\d{1,2}$/.test(w));
  const terms = new Set(words);
  for (const n of extractGhNumbers(text)) terms.add("num:" + n);
  return [...terms];
}

// Extract Ghanaian phone / MoMo numbers from free text.
export function extractGhNumbers(text: string): string[] {
  const out = new Set<string>();
  const matches = (text ?? "").match(/(?:\+?233|0)\s?\d(?:[\s-]?\d){8}/g) ?? [];
  for (const m of matches) {
    const n = normalizeGhPhone(m);
    if (/^0\d{9}$/.test(n)) out.add(n);
  }
  return [...out];
}

// --- online keyword model -------------------------------------------------

// Incrementally update term counts from one labelled message.
export async function updateOnlineModel(content: string, label: Label): Promise<void> {
  const terms = tokenize(content);
  const field = label === "scam" ? "scamCount" : "safeCount";
  await Promise.all(
    terms.map((term) =>
      db.learnedSignal.upsert({
        where: { term },
        create: { term, scamCount: label === "scam" ? 1 : 0, safeCount: label === "safe" ? 1 : 0 },
        update: { [field]: { increment: 1 } },
      }),
    ),
  );
}

// --- community memory (numbers) ------------------------------------------

// Record numbers seen in a scam message so the number lookup learns from it.
export async function recordScamNumbers(content: string): Promise<void> {
  const numbers = extractGhNumbers(content);
  const snippet = content.trim().slice(0, 140);
  for (const phone of numbers) {
    const existing = await db.seller.findUnique({ where: { phone } });
    if (existing) {
      await db.seller.update({
        where: { phone },
        data: {
          trustScore: Math.max(0, existing.trustScore - 20),
          reports: { create: { kind: "scam", note: `Seen in a reported message: "${snippet}"` } },
        },
      });
    } else {
      await db.seller.create({
        data: {
          name: "Community-reported number",
          phone,
          verified: false,
          trustScore: 25,
          reports: { create: { kind: "scam", note: `Seen in a reported message: "${snippet}"` } },
        },
      });
    }
  }
}

// --- retrieval for the next request --------------------------------------

export async function getLearnedContext(): Promise<LearnedContext> {
  const [recent, learned, flagged] = await Promise.all([
    db.scamCheck.findMany({
      where: { OR: [{ feedback: "scam" }, { riskLevel: "danger" }] },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { content: true },
    }),
    db.learnedSignal.findMany({
      where: { scamCount: { gte: 3 } },
      orderBy: { scamCount: "desc" },
      take: 40,
    }),
    db.seller.findMany({
      where: { reports: { some: { kind: "scam" } } },
      select: { phone: true },
      take: 200,
    }),
  ]);

  const learnedTerms = learned
    .map((s) => {
      const total = s.scamCount + s.safeCount;
      const weight = s.scamCount / (total + 1); // 0..1, laplace-smoothed
      return { term: s.term, weight };
    })
    .filter((t) => t.weight >= 0.75);

  return {
    recentScams: recent.map((r) => r.content.trim().slice(0, 160)),
    learnedTerms,
    flaggedNumbers: flagged.map((f) => f.phone),
  };
}

// Fire-and-forget: learn from a completed check without blocking the response.
export async function learnFromCheck(content: string, label: Label): Promise<void> {
  try {
    await updateOnlineModel(content, label);
    if (label === "scam") await recordScamNumbers(content);
  } catch {
    // learning is best-effort; never fail the request because of it
  }
}
