import { ScamShield } from "@/components/ScamShield";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      {/* Hero — the live checker is the main event */}
      <section className="pt-12 pb-10 sm:pt-16 grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-14 items-start">
        <div className="lg:pt-6">
          <h1 className="font-display text-[2.6rem] sm:text-6xl font-extrabold leading-[0.98] tracking-tight text-ink">
            Before you send
            <br />
            that money,
            <br />
            <span className="text-brand">check the message.</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-sm leading-relaxed">
            Paste any suspicious SMS, WhatsApp, or offer and Nkabom tells you
            whether it&apos;s a scam — explained in Twi, Ga, Ewe, Hausa, Pidgin
            or English.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-5 max-w-sm border-t border-border pt-5">
            <Stat value="4" unit="layers" label="of scam signals" />
            <Stat value="6" unit="languages" label="spoken here" />
            <Stat value="0" unit="cedis" label="to check" />
          </dl>
        </div>

        <div id="shield" className="scroll-mt-20 rise">
          <ScamShield />
        </div>
      </section>

      {/* Why — grounded in the product's own safe / caution / danger language */}
      <section className="py-14 border-t border-border">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-8">
          Built to catch the tricks that work here
        </h2>
        <div className="divide-y divide-border">
          <Reason
            tone="danger"
            title="Knows the local playbook"
            body="Fake MTN and Telecel promos, reversal tricks, PIN requests, 'you have won' bait, and double-your-money schemes — the scams Ghanaians actually get."
          />
          <Reason
            tone="caution"
            title="Explains it in your language"
            body="A clear verdict and what-to-do next in Twi, Ga, Ewe, Hausa, Pidgin, or English, so the whole family can understand it."
          />
          <Reason
            tone="safe"
            title="Check a number before you pay"
            body="Look up a Mobile Money number and see its community trust score and whether other people have flagged it."
          />
        </div>
      </section>

      {/* What's next */}
      <section id="more" className="py-14 border-t border-border scroll-mt-20">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-2">
          Then it grows with you
        </h2>
        <p className="text-muted mb-7 max-w-xl leading-relaxed">
          The Scam &amp; Trust Shield works today. From there, Nkabom becomes a
          place to get help and to buy and sell — safely.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <Next
            title="An assistant that speaks Ghana"
            body="Ask anything and get help in your own language — understanding a contract, drafting a message, writing a CV."
          />
          <Next
            title="A marketplace with a memory"
            body="Buy and sell where every seller carries a visible trust score, so the WhatsApp market finally has reputation behind it."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-3xl font-extrabold text-ink leading-none">
        {value}
        <span className="text-base font-semibold text-muted ml-1">{unit}</span>
      </dt>
      <dd className="mt-1 text-xs text-muted">{label}</dd>
    </div>
  );
}

const toneBar: Record<string, string> = {
  danger: "bg-danger",
  caution: "bg-caution",
  safe: "bg-safe",
};

function Reason({ tone, title, body }: { tone: string; title: string; body: string }) {
  return (
    <div className="flex gap-5 py-6 first:pt-0">
      <div className={`mt-1.5 h-10 w-1.5 shrink-0 rounded-full ${toneBar[tone]}`} />
      <div>
        <h3 className="font-display text-xl font-bold mb-1.5">{title}</h3>
        <p className="text-muted leading-relaxed max-w-2xl">{body}</p>
      </div>
    </div>
  );
}

function Next({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6">
      <span className="inline-block text-xs font-medium text-gold mb-3">
        In the works
      </span>
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted leading-relaxed">{body}</p>
    </div>
  );
}
