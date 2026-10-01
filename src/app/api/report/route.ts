import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { learnFromCheck } from "@/lib/learn";

export const runtime = "nodejs";

// POST { content, channel? } — a user reports a scam message/link so Nkabom
// learns from it. This is a strong "scam" label: it updates the online keyword
// model and records any numbers into community memory immediately.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, channel } = (body ?? {}) as { content?: string; channel?: string };
  if (!content || typeof content !== "string" || content.trim().length < 5) {
    return NextResponse.json({ error: "Paste the scam message, link, or details to report." }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "That is too long (max 5000 characters)." }, { status: 400 });
  }

  const trimmed = content.trim();

  try {
    await db.scamCheck.create({
      data: {
        content: trimmed.slice(0, 5000),
        channel: typeof channel === "string" ? channel : "report",
        language: "en",
        riskLevel: "danger",
        riskScore: 100,
        verdict: "Reported as a scam by a Nkabom user.",
        signals: JSON.stringify(["community report"]),
        feedback: "scam", // a report is a strong scam label
      },
    });
    await learnFromCheck(trimmed, "scam");
  } catch {
    return NextResponse.json({ error: "Could not save the report. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Thank you — Nkabom has learned from this and will catch it faster next time.",
  });
}
