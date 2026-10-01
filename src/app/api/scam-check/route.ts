import { NextResponse } from "next/server";
import { analyzeScam, CHANNELS, LANGUAGES, type Channel } from "@/lib/scam";
import { db } from "@/lib/db";
import { getLearnedContext, learnFromCheck } from "@/lib/learn";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, channel, language } = (body ?? {}) as {
    content?: string;
    channel?: string;
    language?: string;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Please provide a message to check." }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message is too long (max 5000 characters)." }, { status: 400 });
  }

  const safeChannel: Channel = (CHANNELS as readonly string[]).includes(channel ?? "")
    ? (channel as Channel)
    : "other";
  const safeLanguage = language && language in LANGUAGES ? language : "en";

  const trimmed = content.trim();

  // Pull what Nkabom has learned so far and analyze with it as context.
  const learned = await getLearnedContext().catch(() => undefined);

  const result = await analyzeScam(
    { content: trimmed, channel: safeChannel, language: safeLanguage },
    learned,
  );

  // Persist the check and learn from it (best-effort).
  let checkId: string | undefined;
  try {
    const row = await db.scamCheck.create({
      data: {
        content: trimmed.slice(0, 5000),
        channel: safeChannel,
        language: safeLanguage,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        verdict: result.verdict,
        signals: JSON.stringify(result.signals),
      },
      select: { id: true },
    });
    checkId = row.id;

    // Weak online label from the verdict (user feedback can correct it later).
    if (result.riskLevel === "danger") await learnFromCheck(trimmed, "scam");
    else if (result.riskLevel === "safe") await learnFromCheck(trimmed, "safe");
  } catch {
    // ignore persistence/learning errors
  }

  return NextResponse.json({ ...result, checkId });
}
