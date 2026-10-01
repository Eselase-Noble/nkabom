import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/trends — a lightweight "scams going around now" summary built from
// the learned signals and recent reports.
export async function GET() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [terms, reports7d, totalChecks, flaggedNumbers] = await Promise.all([
    db.learnedSignal.findMany({
      where: { scamCount: { gte: 2 } },
      orderBy: { scamCount: "desc" },
      take: 14,
    }),
    db.scamCheck.count({
      where: { createdAt: { gte: weekAgo }, OR: [{ feedback: "scam" }, { riskLevel: "danger" }] },
    }),
    db.scamCheck.count(),
    db.seller.count({ where: { reports: { some: { kind: "scam" } } } }),
  ]);

  const topTerms = terms
    .filter((t) => t.scamCount > t.safeCount) // keep scam-leaning terms
    .map((t) => ({
      label: t.term.startsWith("num:") ? t.term.slice(4) : t.term,
      isNumber: t.term.startsWith("num:"),
      count: t.scamCount,
    }));

  return NextResponse.json({ topTerms, reports7d, totalChecks, flaggedNumbers });
}
