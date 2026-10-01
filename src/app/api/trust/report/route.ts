import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeGhPhone, isLikelyGhPhone } from "@/lib/phone";

export const runtime = "nodejs";

// POST { phone, note? } — a user flags a Mobile Money / phone number as a scam.
// Grows the community trust DB directly from the lookup UI.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phone: phoneRaw, note } = (body ?? {}) as { phone?: string; note?: string };
  if (!phoneRaw || !isLikelyGhPhone(phoneRaw)) {
    return NextResponse.json({ error: "Enter a valid Ghana number (e.g. 024XXXXXXX)." }, { status: 400 });
  }

  const phone = normalizeGhPhone(phoneRaw);
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 300) : "";

  try {
    const existing = await db.seller.findUnique({ where: { phone } });
    if (existing) {
      await db.seller.update({
        where: { phone },
        data: {
          trustScore: Math.max(0, existing.trustScore - 20),
          reports: { create: { kind: "scam", note: cleanNote || "Reported via number lookup." } },
        },
      });
    } else {
      await db.seller.create({
        data: {
          name: "Community-reported number",
          phone,
          verified: false,
          trustScore: 25,
          reports: { create: { kind: "scam", note: cleanNote || "Reported via number lookup." } },
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Could not save the report. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Thank you — this number is now flagged for the community.",
  });
}
