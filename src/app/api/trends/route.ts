import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTrendingTerms } from "@/lib/learn";

export const runtime = "nodejs";

// GET /api/trends — a lightweight "scams going around now" summary built from
// the (noise-filtered) learned signals and recent reports.
export async function GET() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [topTerms, reports7d, totalChecks, flaggedNumbers] = await Promise.all([
    getTrendingTerms(14),
    db.scamCheck.count({
      where: { createdAt: { gte: weekAgo }, OR: [{ feedback: "scam" }, { riskLevel: "danger" }] },
    }),
    db.scamCheck.count(),
    db.seller.count({ where: { reports: { some: { kind: "scam" } } } }),
  ]);

  return NextResponse.json({
    topTerms: topTerms.map((t) => ({ label: t.label, isNumber: t.isNumber, count: t.count })),
    reports7d,
    totalChecks,
    flaggedNumbers,
  });
}
