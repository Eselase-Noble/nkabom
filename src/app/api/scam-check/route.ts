import { NextResponse } from "next/server";
import { analyzeScam, CHANNELS, LANGUAGES, type Channel } from "@/lib/scam";
import { db } from "@/lib/db";

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

  const result = await analyzeScam({
    content: content.trim(),
    channel: safeChannel,
    language: safeLanguage,
  });

  // Persist the check (best-effort; a DB hiccup shouldn't fail the response).
  try {
    await db.scamCheck.create({
      data: {
        content: content.trim().slice(0, 5000),
        channel: safeChannel,
        language: safeLanguage,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        verdict: result.verdict,
        signals: JSON.stringify(result.signals),
      },
    });
  } catch {
    // ignore persistence errors
  }

  return NextResponse.json(result);
}
