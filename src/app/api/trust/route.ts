import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeGhPhone, isLikelyGhPhone } from "@/lib/phone";

export const runtime = "nodejs";

// GET /api/trust?phone=024XXXXXXX — look up a seller's trust profile by number.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phoneRaw = searchParams.get("phone") ?? "";

  if (!isLikelyGhPhone(phoneRaw)) {
    return NextResponse.json(
      { error: "Enter a valid Ghana phone number (e.g. 024XXXXXXX)." },
      { status: 400 },
    );
  }

  const phone = normalizeGhPhone(phoneRaw);
  const seller = await db.seller.findUnique({
    where: { phone },
    include: {
      reports: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!seller) {
    return NextResponse.json({
      found: false,
      phone,
      message:
        "No record for this number yet. That is not a guarantee it is safe — always verify before paying.",
    });
  }

  const scamReports = seller.reports.filter((r) => r.kind === "scam").length;

  return NextResponse.json({
    found: true,
    phone,
    seller: {
      name: seller.name,
      businessName: seller.businessName,
      region: seller.region,
      verified: seller.verified,
      trustScore: seller.trustScore,
      scamReports,
      recentReports: seller.reports.map((r) => ({
        kind: r.kind,
        note: r.note,
        createdAt: r.createdAt,
      })),
    },
  });
}
