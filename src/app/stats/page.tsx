import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nkabom — insights",
  description: "What Nkabom is learning: checks, risk breakdown, top scams, and the trust database.",
};

export default async function StatsPage() {
  const [total, danger, caution, safe, reports, flaggedNumbers, learnedCount, topTerms, recent] =
    await Promise.all([
      db.scamCheck.count(),
      db.scamCheck.count({ where: { riskLevel: "danger" } }),
      db.scamCheck.count({ where: { riskLevel: "caution" } }),
      db.scamCheck.count({ where: { riskLevel: "safe" } }),
      db.scamCheck.count({ where: { feedback: "scam" } }),
      db.seller.count({ where: { reports: { some: { kind: "scam" } } } }),
      db.learnedSignal.count(),
      db.learnedSignal.findMany({
        where: { scamCount: { gte: 2 } },
        orderBy: { scamCount: "desc" },
        take: 20,
      }),
      db.scamCheck.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Insights</h1>
      <p className="mt-2 text-muted max-w-xl leading-relaxed">
        What Nkabom has learned so far from the community. This is the research
        view — every check and report sharpens detection over time.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Metric label="Total checks" value={total} />
        <Metric label="Flagged as scam" value={danger} tone="danger" />
        <Metric label="Caution" value={caution} tone="caution" />
        <Metric label="Looked safe" value={safe} tone="safe" />
        <Metric label="User reports" value={reports} />
        <Metric label="Flagged numbers" value={flaggedNumbers} />
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-10">
        <section>
          <h2 className="font-display text-xl font-bold mb-4">
            Top learned scam signals{" "}
            <span className="text-sm font-normal text-muted">({learnedCount} tracked)</span>
          </h2>
          {topTerms.length === 0 ? (
            <p className="text-sm text-muted">Not enough data yet — check and report a few scams.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topTerms.map((t) => (
                <span
                  key={t.term}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-sm"
                >
                  <span className={t.term.startsWith("num:") ? "tabular-nums" : ""}>
                    {t.term.startsWith("num:") ? t.term.slice(4) : t.term}
                  </span>
                  <span className="text-xs text-danger font-medium">{t.scamCount}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-4">Recent checks</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No checks yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start gap-3 text-sm border-b border-border pb-2">
                  <RiskDot level={r.riskLevel} />
                  <span className="flex-1 text-ink/80 line-clamp-2">{r.content}</span>
                  <span className="text-xs text-muted tabular-nums shrink-0">{r.riskScore}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const toneColor: Record<string, string> = {
  danger: "text-danger",
  caution: "text-caution",
  safe: "text-safe",
};

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={`font-display text-3xl font-extrabold ${tone ? toneColor[tone] : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function RiskDot({ level }: { level: string }) {
  const c = level === "danger" ? "bg-danger" : level === "caution" ? "bg-caution" : "bg-safe";
  return <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${c}`} />;
}
