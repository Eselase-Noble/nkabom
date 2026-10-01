import Anthropic from "@anthropic-ai/sdk";

// A scam analysis result shared by the AI analyzer and the heuristic fallback.
export type RiskLevel = "safe" | "caution" | "danger";

export interface ScamResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  verdict: string; // one-line conclusion
  signals: string[]; // red flags detected
  explanation: string; // plain-language reasoning
  advice: string; // what the user should do
  source: "ai" | "heuristic"; // which engine produced this
}

export const LANGUAGES: Record<string, string> = {
  en: "English",
  twi: "Twi (Akan)",
  ga: "Ga",
  ewe: "Ewe",
  hausa: "Hausa",
  pidgin: "Ghanaian Pidgin English",
};

export const CHANNELS = ["sms", "whatsapp", "call", "social", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ScamInput {
  content: string;
  channel: Channel;
  language: string; // key of LANGUAGES
}

// JSON schema the model must return, so we always get a well-formed result.
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskLevel: { type: "string", enum: ["safe", "caution", "danger"] },
    riskScore: { type: "integer" },
    verdict: { type: "string" },
    signals: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
    advice: { type: "string" },
  },
  required: ["riskLevel", "riskScore", "verdict", "signals", "explanation", "advice"],
} as const;

/**
 * Analyze a message for scam/fraud risk. Uses Claude when an API key is set;
 * otherwise falls back to a local heuristic so the feature always works.
 */
export async function analyzeScam(input: ScamInput): Promise<ScamResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    try {
      return await analyzeWithClaude(input, apiKey);
    } catch {
      // Fall through to the heuristic if the API call fails for any reason.
    }
  }
  return heuristicAnalyze(input);
}

async function analyzeWithClaude(input: ScamInput, apiKey: string): Promise<ScamResult> {
  const client = new Anthropic({ apiKey });
  const langName = LANGUAGES[input.language] ?? "English";

  const system = `You are Nkabom's fraud-detection assistant for Ghana. You help ordinary people decide whether a message, offer, or call is a scam.

You understand local scam patterns: fake MTN/Telecel/AirtelTigo Mobile Money (MoMo) promotions, "you have won" lottery scams, fake agents asking for PINs or reversal codes, "send money to this number" requests, fake job offers, investment/"double your money" schemes, romance scams, and phishing links.

Assess the risk and respond with:
- riskScore: 0-100 (0 = clearly safe, 100 = definitely a scam)
- riskLevel: "safe" (0-33), "caution" (34-66), or "danger" (67-100)
- verdict: one short sentence conclusion
- signals: the specific red flags you detected (empty if none)
- explanation: 1-3 sentences explaining your reasoning for a non-technical person
- advice: concrete next step (e.g. "Do not send money or share your PIN. Call the official number on the back of your SIM pack.")

Write "verdict", "explanation", and "advice" in ${langName}. Keep "signals" short (they may stay in English).`;

  const user = `Channel: ${input.channel}
Message/offer to check:
"""
${input.content}
"""`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = JSON.parse(text) as Omit<ScamResult, "source">;
  return {
    ...parsed,
    riskScore: clampScore(parsed.riskScore),
    riskLevel: normalizeLevel(parsed.riskLevel, parsed.riskScore),
    signals: parsed.signals ?? [],
    source: "ai",
  };
}

// ---- Heuristic fallback -------------------------------------------------

interface Pattern {
  re: RegExp;
  weight: number;
  signal: string;
}

// Ghana-flavored scam signals. Weights sum toward a 0-100 score.
const PATTERNS: Pattern[] = [
  { re: /\b(pin|p\.i\.n)\b/i, weight: 35, signal: "Asks for your PIN" },
  { re: /reversal|reverse the|wrong number|sent by mistake/i, weight: 30, signal: "MoMo reversal trick" },
  { re: /you have won|congratulations|you are a winner|lucky (winner|customer)/i, weight: 30, signal: "'You have won' lottery bait" },
  { re: /promo(tion)?|bonus|free (data|airtime|cash)/i, weight: 18, signal: "Too-good promotion" },
  { re: /double (your )?money|invest(ment)?|returns?|forex|crypto/i, weight: 25, signal: "Investment / double-your-money scheme" },
  { re: /send (me )?(ghs|gh₵|cedis|money|\d)/i, weight: 22, signal: "Request to send money" },
  { re: /momo|mobile money|mtn|telecel|airteltigo|vodafone/i, weight: 10, signal: "Mentions Mobile Money / telco" },
  { re: /verify (your )?(account|number|sim)|update your details/i, weight: 20, signal: "Account 'verification' phishing" },
  { re: /urgent|immediately|within \d+ ?(min|hour|hrs)|act now|expire/i, weight: 15, signal: "Creates false urgency" },
  { re: /https?:\/\/|bit\.ly|tinyurl|wa\.me/i, weight: 18, signal: "Contains a suspicious link" },
  { re: /agent|customer (care|service)|head office/i, weight: 12, signal: "Impersonates an agent/official" },
  { re: /job offer|vacancy|recruitment|work from home/i, weight: 15, signal: "Possible fake job offer" },
];

export function heuristicAnalyze(input: ScamInput): ScamResult {
  const text = input.content ?? "";
  const matched: string[] = [];
  let score = 0;
  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      score += p.weight;
      matched.push(p.signal);
    }
  }
  // A link plus a money/PIN ask is a strong combination.
  if (matched.length >= 3) score += 10;
  score = clampScore(score);

  const riskLevel = normalizeLevel(undefined, score);
  const verdict =
    riskLevel === "danger"
      ? "This looks like a scam. Do not act on it."
      : riskLevel === "caution"
        ? "Be careful — this message shows warning signs."
        : "No obvious scam signals found, but stay alert.";

  const advice =
    riskLevel === "safe"
      ? "Still never share your Mobile Money PIN or one-time codes with anyone."
      : "Do not send money, share your PIN, or click links. Verify by calling the official number (not the one in the message).";

  const explanation = matched.length
    ? `Detected ${matched.length} warning sign(s) commonly used in Ghanaian scams.`
    : "No common scam keywords were detected, but checks are limited without AI enabled.";

  return {
    riskLevel,
    riskScore: score,
    verdict,
    signals: matched,
    explanation,
    advice,
    source: "heuristic",
  };
}

// ---- helpers ------------------------------------------------------------

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLevel(level: RiskLevel | undefined, score: number): RiskLevel {
  if (level === "safe" || level === "caution" || level === "danger") return level;
  if (score >= 67) return "danger";
  if (score >= 34) return "caution";
  return "safe";
}
