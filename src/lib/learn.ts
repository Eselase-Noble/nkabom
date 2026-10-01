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

// Common English function/filler words that carry no scam signal. Kept broad so
// the learned-term feed surfaces real indicators (pin, momo, promo, won…), not
// grammar. Scam-relevant short words (pin, won, otp, sim) are deliberately absent.
const STOPWORDS = new Set(
  (
    "a an and are as at be been being but by can cant could did do does doing done dont for from " +
    "had has have having her here hers him his how i if in into is it its just like make me my no " +
    "not now of off on once only or our out over own per put re see so some such than that the their " +
    "them then there these they this those to too under until up us use using very was we were what " +
    "when where which while who whom why will with would you your yours all any been get got new one " +
    "out via way well also more most much many back come goes went good day today "
  ).split(/\s+/).filter(Boolean),
);

// A term worth tracking as a signal: not a stopword, not a bare number
// (amounts/fragments), reasonable length. Phone numbers (num: prefix) always pass.
export function isMeaningfulTerm(term: string): boolean {
  if (term.startsWith("num:")) return true;
  if (/^\d+$/.test(term)) return false; // pure numbers: amounts, fragments like 317/539
  if (term.length < 3 || term.length > 24) return false;
  if (STOPWORDS.has(term)) return false;
  return true;
}

// Pull candidate signal terms out of a message: informative words + any phone
// numbers (as whole tokens).
export function tokenize(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  const words = lower
    .replace(/[^a-z0-9₵+\s]/g, " ")
    .split(/\s+/)
    .filter(isMeaningfulTerm);
  const terms = new Set(words);
  for (const n of extractGhNumbers(text)) terms.add("num:" + n);
  return [...terms];
}

// Laplace-smoothed probability a term signals a scam (0..1).
export function scamWeight(scamCount: number, safeCount: number): number {
  return (scamCount + 1) / (scamCount + safeCount + 2);
}

// Minimum times a term must appear in scams before we trust it as a signal.
// Noise is filtered by isMeaningfulTerm + the scam-ratio test, so this can stay
// low without surfacing junk.
export const MIN_SCAM_SUPPORT = 2;

export interface TrendingTerm {
  label: string; // display text (phone number or word)
  isNumber: boolean;
  count: number; // scamCount
  weight: number; // scam probability 0..1
}

// The single source of truth for "which learned terms are trustworthy signals",
// used by the trends feed, the stats page, and the detection context. Requires
// enough support AND a strong scam lean, and drops noise terms.
export async function getTrendingTerms(limit = 14): Promise<TrendingTerm[]> {
  const rows = await db.learnedSignal.findMany({
    where: { scamCount: { gte: MIN_SCAM_SUPPORT } },
    orderBy: { scamCount: "desc" },
    take: limit * 5,
  });
  return rows
    .filter((r) => isMeaningfulTerm(r.term) && scamWeight(r.scamCount, r.safeCount) >= 0.66)
    .slice(0, limit)
    .map((r) => ({
      label: r.term.startsWith("num:") ? r.term.slice(4) : r.term,
      isNumber: r.term.startsWith("num:"),
      count: r.scamCount,
      weight: scamWeight(r.scamCount, r.safeCount),
    }));
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
  const [recent, trending, flagged] = await Promise.all([
    db.scamCheck.findMany({
      where: { OR: [{ feedback: "scam" }, { riskLevel: "danger" }] },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { content: true },
    }),
    getTrendingTerms(40),
    db.seller.findMany({
      where: { reports: { some: { kind: "scam" } } },
      select: { phone: true },
      take: 200,
    }),
  ]);

  // Rebuild the stored token form (num: prefix) for the heuristic matcher.
  const learnedTerms = trending.map((t) => ({
    term: t.isNumber ? "num:" + t.label : t.label,
    weight: t.weight,
  }));

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
