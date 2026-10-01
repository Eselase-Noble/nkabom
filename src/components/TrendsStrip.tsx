"use client";

import { useEffect, useState } from "react";

interface Trends {
  topTerms: { label: string; isNumber: boolean; count: number }[];
  reports7d: number;
  totalChecks: number;
  flaggedNumbers: number;
}

export function TrendsStrip() {
  const [data, setData] = useState<Trends | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  const hasSignals = data && data.topTerms.length > 0;

  return (
    <section className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Scams going around now
            </h2>
            <p className="mt-2 text-muted max-w-xl leading-relaxed">
              Words and numbers Nkabom is seeing most in reported scams. This list
              updates as people check and report — the system learns in real time.
            </p>
          </div>
          <a href="/stats" className="text-sm font-medium text-brand hover:text-brand-dark whitespace-nowrap">
            See all insights →
          </a>
        </div>

        {!data ? (
          <p className="mt-8 text-sm text-muted">Loading…</p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted">
              <Counter n={data.totalChecks} label="messages checked" />
              <Counter n={data.reports7d} label="scams flagged this week" />
              <Counter n={data.flaggedNumbers} label="numbers reported" />
            </div>

            {hasSignals ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {data.topTerms.map((t) => (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
                  >
                    <span className={t.isNumber ? "tabular-nums text-ink" : "text-ink"}>
                      {t.isNumber ? t.label : t.label}
                    </span>
                    <span className="text-xs font-medium text-danger">{t.count}×</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">
                No trends yet — be the first to check or report a scam above.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Counter({ n, label }: { n: number; label: string }) {
  return (
    <span>
      <span className="font-display text-xl font-extrabold text-ink">{n}</span>{" "}
      {label}
    </span>
  );
}
