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
  extractedText?: string;
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
  const [image, setImage] = useState<{ b64: string; mime: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScamResult | null>(null);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("That image is too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result); // data:<mime>;base64,<data>
      const comma = url.indexOf(",");
      setImage({ b64: url.slice(comma + 1), mime: file.type, name: file.name });
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function check() {
    setError(null);
    setResult(null);
    if (content.trim().length === 0 && !image) {
      setError("Paste the message, or upload a screenshot of it.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/scam-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          channel,
          language,
          imageBase64: image?.b64,
          imageMime: image?.mime,
        }),
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
          Paste the message, or upload a screenshot
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="e.g. Congratulations! Your number won GHS 5,000 in the MTN promo. Send your PIN to claim…"
          className={`${fieldBase} px-3.5 py-3 text-sm resize-y`}
        />
        <div className="mt-2 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-dark cursor-pointer font-medium">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v6l-2.5-2.5a1 1 0 00-1.4 0L9 14l-1.6-1.6a1 1 0 00-1.4 0L4 14.4V5zm3 2.5A1.5 1.5 0 118.5 9 1.5 1.5 0 017 7.5z" />
            </svg>
            Upload screenshot
            <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
          </label>
          {image && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              {image.name}
              <button
                onClick={() => setImage(null)}
                className="text-danger hover:underline"
                aria-label="Remove image"
              >
                remove
              </button>
            </span>
          )}
        </div>
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
        {loading ? "Checking…" : image ? "Check this screenshot" : "Check this message"}
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

      {result.extractedText && result.extractedText.trim().length > 0 && (
        <div className="rounded-lg bg-surface/70 border border-border p-3">
          <p className="font-display text-sm font-bold text-ink mb-1">Text read from your screenshot</p>
          <p className="text-sm text-ink/80 whitespace-pre-wrap">{result.extractedText}</p>
        </div>
      )}

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

      {result.riskLevel !== "safe" && <ShareWarning result={result} />}

      {result.checkId && <Feedback checkId={result.checkId} />}

      <p className="text-[11px] text-muted">{SOURCE_LABEL[result.source]}</p>
    </div>
  );
}

function ShareWarning({ result }: { result: ScamResult }) {
  function share() {
    const site = typeof window !== "undefined" ? window.location.origin : "";
    const msg =
      `⚠️ Nkabom scam alert (${result.riskScore}/100): ${result.verdict}\n\n` +
      `${result.advice}\n\n` +
      `Check suspicious messages free at ${site}`;
    // Prefer the native share sheet on mobile; fall back to WhatsApp.
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Nkabom scam alert", text: msg }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
  }
  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-medium text-white hover:brightness-95 transition"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.3.1.4.1.6-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.3z" />
      </svg>
      Share this warning
    </button>
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
        <div className="rounded-xl ring-1 ring-caution/30 bg-caution/10 p-4 space-y-3">
          <div>
            <p className="font-display text-lg font-bold text-caution mb-1">No record yet</p>
            <p className="text-sm text-ink/80">{data.message}</p>
          </div>
          <FlagNumber phone={data.phone} />
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

      <FlagNumber phone={phone} />
    </div>
  );
}

function FlagNumber({ phone }: { phone: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  async function flag() {
    setState("sending");
    try {
      await fetch("/api/trust/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setState("done");
    } catch {
      setState("idle");
    }
  }
  if (state === "done")
    return <p className="text-xs text-brand font-medium pt-1">Thanks — this number is now flagged for the community.</p>;
  return (
    <button
      onClick={flag}
      disabled={state === "sending"}
      className="text-xs rounded-md border border-border px-2.5 py-1.5 text-ink hover:border-danger hover:text-danger transition-colors disabled:opacity-60"
    >
      {state === "sending" ? "Reporting…" : "Report this number as a scam"}
    </button>
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
