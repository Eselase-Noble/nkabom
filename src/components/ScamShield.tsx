"use client";

import { useState } from "react";

type RiskLevel = "safe" | "caution" | "danger";

interface ScamResult {
  riskLevel: RiskLevel;
  riskScore: number;
  verdict: string;
  signals: string[];
  explanation: string;
  advice: string;
  source: "claude" | "openai" | "heuristic";
  checkId?: string;
}

const SOURCE_LABEL: Record<ScamResult["source"], string> = {
  claude: "Analyzed by Nkabom AI (Claude). Guidance only — it is not a guarantee.",
  openai: "Analyzed by Nkabom AI (OpenAI). Guidance only — it is not a guarantee.",
  heuristic: "Quick check (AI off). Guidance only — it is not a guarantee.",
};

const LANGS = [
  { k: "en", label: "English" },
  { k: "twi", label: "Twi" },
  { k: "ga", label: "Ga" },
  { k: "ewe", label: "Ewe" },
  { k: "hausa", label: "Hausa" },
  { k: "pidgin", label: "Pidgin" },
];

const CHANNELS = [
  { k: "sms", label: "SMS" },
  { k: "whatsapp", label: "WhatsApp" },
  { k: "call", label: "Phone call" },
  { k: "social", label: "Social media" },
  { k: "other", label: "Other" },
];

const riskStyles: Record<RiskLevel, { ring: string; bg: string; text: string; label: string }> = {
  safe: { ring: "ring-safe/30", bg: "bg-safe/10", text: "text-safe", label: "Looks safe" },
  caution: { ring: "ring-caution/30", bg: "bg-caution/10", text: "text-caution", label: "Be careful" },
  danger: { ring: "ring-danger/30", bg: "bg-danger/10", text: "text-danger", label: "Likely scam" },
};

// Shared field styles — explicit dark text + visible placeholder so input is readable.
const fieldBase =
  "w-full rounded-xl border border-border bg-white text-ink placeholder:text-muted/70 caret-brand outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ScamShield() {
  const [tab, setTab] = useState<"message" | "number" | "report">("message");
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex border-b border-border">
        <TabButton active={tab === "message"} onClick={() => setTab("message")}>
          Check message
        </TabButton>
        <TabButton active={tab === "number"} onClick={() => setTab("number")}>
          Check number
        </TabButton>
        <TabButton active={tab === "report"} onClick={() => setTab("report")}>
          Report a scam
        </TabButton>
      </div>
      <div className="p-5 sm:p-7">
        {tab === "message" && <MessageChecker />}
        {tab === "number" && <NumberChecker />}
        {tab === "report" && <Reporter />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-3.5 text-sm font-medium transition-colors ${
        active
          ? "bg-surface text-brand border-b-2 border-brand"
          : "bg-background/40 text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function MessageChecker() {
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("sms");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScamResult | null>(null);

  async function check() {
    setError(null);
    setResult(null);
    if (content.trim().length === 0) {
      setError("Paste the message you received first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/scam-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, channel, language }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Try again.");
      else setResult(data as ScamResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Paste the message or describe the offer
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="e.g. Congratulations! Your number won GHS 5,000 in the MTN promo. Send your PIN to claim…"
          className={`${fieldBase} px-3.5 py-3 text-sm resize-y`}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Field label="Where did it come from?">
          <Select value={channel} onChange={setChannel} options={CHANNELS} />
        </Field>
        <Field label="Explain in">
          <Select value={language} onChange={setLanguage} options={LANGS} />
        </Field>
      </div>

      <button
        onClick={check}
        disabled={loading}
        className="w-full rounded-xl bg-brand px-4 py-3 text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check this message"}
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}

function ResultCard({ result }: { result: ScamResult }) {
  const s = riskStyles[result.riskLevel];
  return (
    <div className={`rounded-xl ring-1 ${s.ring} ${s.bg} p-4 space-y-3 rise`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-display text-sm font-bold ${s.text}`}>{s.label}</span>
        <RiskMeter score={result.riskScore} level={result.riskLevel} />
      </div>
      <p className="font-display text-xl font-bold leading-snug text-ink">{result.verdict}</p>
      <p className="text-sm text-ink/80 leading-relaxed">{result.explanation}</p>

      {result.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.signals.map((sig, i) => (
            <span
              key={i}
              className="text-xs rounded-full bg-surface border border-border px-2.5 py-1 text-muted"
            >
              {sig}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-surface/70 border border-border p-3">
        <p className="font-display text-sm font-bold text-ink mb-1">What to do</p>
        <p className="text-sm text-ink/90">{result.advice}</p>
      </div>

      {result.checkId && <Feedback checkId={result.checkId} />}

      <p className="text-[11px] text-muted">{SOURCE_LABEL[result.source]}</p>
    </div>
  );
}

function Feedback({ checkId }: { checkId: string }) {
  const [sent, setSent] = useState<string | null>(null);
  async function send(feedback: "scam" | "safe") {
    setSent("…");
    try {
      await fetch("/api/scam-check/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: checkId, feedback }),
      });
      setSent("Thanks — Nkabom learned from this.");
    } catch {
      setSent("Could not send, but no problem.");
    }
  }
  if (sent) return <p className="text-xs text-brand font-medium">{sent}</p>;
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-muted">Was this right?</span>
      <button
        onClick={() => send("scam")}
        className="text-xs rounded-md border border-border px-2.5 py-1 text-ink hover:border-danger hover:text-danger transition-colors"
      >
        It was a scam
      </button>
      <button
        onClick={() => send("safe")}
        className="text-xs rounded-md border border-border px-2.5 py-1 text-ink hover:border-safe hover:text-safe transition-colors"
      >
        Actually safe
      </button>
    </div>
  );
}

function RiskMeter({ score, level }: { score: number; level: RiskLevel }) {
  const color =
    level === "danger" ? "bg-danger" : level === "caution" ? "bg-caution" : "bg-safe";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-border overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted">{score}/100</span>
    </div>
  );
}

function NumberChecker() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  async function lookup() {
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/trust?phone=${encodeURIComponent(phone)}`);
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Something went wrong.");
      else setData(d);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Mobile Money / phone number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 024 123 4567"
          inputMode="tel"
          className={`${fieldBase} px-3.5 py-3 text-sm`}
        />
      </div>
      <button
        onClick={lookup}
        disabled={loading}
        className="w-full rounded-xl bg-brand px-4 py-3 text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {loading ? "Looking up…" : "Look up this number"}
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data && !data.found && (
        <div className="rounded-xl ring-1 ring-caution/30 bg-caution/10 p-4">
          <p className="font-display text-lg font-bold text-caution mb-1">No record yet</p>
          <p className="text-sm text-ink/80">{data.message}</p>
        </div>
      )}

      {data && data.found && <SellerCard seller={data.seller} phone={data.phone} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SellerCard({ seller, phone }: { seller: any; phone: string }) {
  const danger = seller.scamReports > 0 || seller.trustScore < 40;
  const tone = danger ? riskStyles.danger : seller.verified ? riskStyles.safe : riskStyles.caution;
  return (
    <div className={`rounded-xl ring-1 ${tone.ring} ${tone.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold leading-tight text-ink">{seller.name}</p>
          {seller.businessName && <p className="text-sm text-muted">{seller.businessName}</p>}
        </div>
        {seller.verified && (
          <span className="inline-flex items-center gap-1 text-xs rounded-md bg-safe/15 text-safe px-2.5 py-1 font-medium">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Trust score</span>
        <RiskMeter
          score={seller.trustScore}
          level={seller.trustScore >= 67 ? "safe" : seller.trustScore >= 40 ? "caution" : "danger"}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted">
          Number: <span className="text-ink tabular-nums">{phone}</span>
        </span>
        {seller.region && <span className="text-muted">Region: {seller.region}</span>}
        <span className={seller.scamReports > 0 ? "text-danger font-medium" : "text-muted"}>
          {seller.scamReports} scam report{seller.scamReports === 1 ? "" : "s"}
        </span>
      </div>

      {seller.recentReports?.length > 0 && (
        <div className="space-y-1.5">
          {seller.recentReports.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any, i: number) => (
              <div key={i} className="text-xs text-ink/70 border-l-2 border-border pl-2">
                <span className="font-medium capitalize">{r.kind}</span>
                {r.note ? ` — ${r.note}` : ""}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Reporter() {
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("sms");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setDone(null);
    if (content.trim().length < 5) {
      setError("Paste the scam message or link you want to report.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, channel }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Something went wrong.");
      else {
        setDone(d.message ?? "Thank you — Nkabom has learned from this.");
        setContent("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Seen a scam? Paste the message, link, or number here. Nkabom learns from
        it right away, so it protects everyone else faster.
      </p>
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Scam message, link, or number
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Paste the full scam message or link here…"
          className={`${fieldBase} px-3.5 py-3 text-sm resize-y`}
        />
      </div>
      <Field label="Where did you get it?">
        <Select value={channel} onChange={setChannel} options={CHANNELS} />
      </Field>
      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-danger px-4 py-3 text-white font-medium hover:brightness-95 transition disabled:opacity-60"
      >
        {loading ? "Reporting…" : "Report this scam"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {done && (
        <div className="rounded-xl ring-1 ring-safe/30 bg-safe/10 p-4">
          <p className="font-display text-base font-bold text-safe mb-1">Report received</p>
          <p className="text-sm text-ink/80">{done}</p>
        </div>
      )}
    </div>
  );
}

// ---- small UI helpers ----

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { k: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldBase} px-3 py-2.5 text-sm`}
    >
      {options.map((o) => (
        <option key={o.k} value={o.k}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
