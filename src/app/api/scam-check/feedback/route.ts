import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { learnFromCheck } from "@/lib/learn";

export const runtime = "nodejs";

// POST { id, feedback: "scam" | "safe" } — record user ground truth and learn
// from it (strong label). This is how a correction improves the next check.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, feedback } = (body ?? {}) as { id?: string; feedback?: string };
  if (!id || (feedback !== "scam" && feedback !== "safe")) {
    return NextResponse.json({ error: "Provide a check id and feedback of 'scam' or 'safe'." }, { status: 400 });
  }

  const check = await db.scamCheck.findUnique({ where: { id } });
  if (!check) {
    return NextResponse.json({ error: "Check not found." }, { status: 404 });
  }

  await db.scamCheck.update({ where: { id }, data: { feedback } });
  await learnFromCheck(check.content, feedback);

  return NextResponse.json({ ok: true });
}
