import { NextResponse } from "next/server";
import { analyzeScam, CHANNELS, LANGUAGES, type Channel } from "@/lib/scam";
import { db } from "@/lib/db";
import { getLearnedContext, learnFromCheck } from "@/lib/learn";

export const runtime = "nodejs";

// ~7M base64 chars ≈ 5MB image.
const MAX_IMAGE_B64 = 7_000_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, channel, language, imageBase64, imageMime } = (body ?? {}) as {
    content?: string;
    channel?: string;
    language?: string;
    imageBase64?: string;
    imageMime?: string;
  };

  const text = typeof content === "string" ? content.trim() : "";
  const hasImage = typeof imageBase64 === "string" && imageBase64.length > 0;

  if (!text && !hasImage) {
    return NextResponse.json({ error: "Paste a message or upload a screenshot to check." }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: "Message is too long (max 5000 characters)." }, { status: 400 });
  }
  if (hasImage && imageBase64!.length > MAX_IMAGE_B64) {
    return NextResponse.json({ error: "That image is too large (max ~5MB)." }, { status: 400 });
  }

  const safeChannel: Channel = (CHANNELS as readonly string[]).includes(channel ?? "")
    ? (channel as Channel)
    : "other";
  const safeLanguage = language && language in LANGUAGES ? language : "en";

  // Pull what Nkabom has learned so far and analyze with it as context.
  const learned = await getLearnedContext().catch(() => undefined);

  const result = await analyzeScam(
    {
      content: text,
      channel: safeChannel,
      language: safeLanguage,
      imageBase64: hasImage ? imageBase64 : undefined,
      imageMime: hasImage ? imageMime : undefined,
    },
    learned,
  );

  // What we learn from / store: typed text, else text read from the image.
  const learnText = (text || result.extractedText || "").trim();

  let checkId: string | undefined;
  try {
    const row = await db.scamCheck.create({
      data: {
        content: (learnText || "[screenshot]").slice(0, 5000),
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

    if (learnText) {
      if (result.riskLevel === "danger") await learnFromCheck(learnText, "scam");
      else if (result.riskLevel === "safe") await learnFromCheck(learnText, "safe");
    }
  } catch {
    // ignore persistence/learning errors
  }

  return NextResponse.json({ ...result, checkId });
}
