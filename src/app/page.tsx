import { ScamShield } from "@/components/ScamShield";

export default function Home() {
  return (
    <>
      {/* Hero — full-bleed green panel, left-anchored, with the live tool alongside */}
      <section className="bg-brand-dark text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="font-display text-[2.7rem] sm:text-6xl font-extrabold leading-[0.97] tracking-tight">
              Before you send
              <br />
              that money,
              <br />
              <span className="text-gold">check the message.</span>
            </h1>
            <p className="mt-6 text-lg text-white/75 max-w-md leading-relaxed">
              Paste any suspicious SMS, WhatsApp, or offer and Nkabom tells you
              whether it&apos;s a scam — explained in Twi, Ga, Ewe, Hausa, Pidgin
              or English.
            </p>

            <dl className="mt-9 grid grid-cols-3 gap-6 max-w-sm border-t border-white/20 pt-6">
              <HeroStat value="4" unit="layers" label="of scam signals" />
              <HeroStat value="6" unit="languages" label="spoken here" />
              <HeroStat value="0" unit="cedis" label="to check" />
            </dl>
          </div>

          <div id="shield" className="scroll-mt-24 rise lg:justify-self-end w-full lg:max-w-md shadow-2xl shadow-black/20 rounded-2xl">
            <ScamShield />
          </div>
        </div>
      </section>

      {/* Why — three columns, left-aligned, grounded in safe/caution/danger */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
          Built to catch the tricks that work here
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-x-10 gap-y-8">
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

      {/* What's next — wide band */}
      <section id="more" className="border-t border-border bg-surface/40 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Then it grows with you
              </h2>
              <p className="mt-3 text-muted leading-relaxed">
                The Scam &amp; Trust Shield works today. From there, Nkabom
                becomes a place to get help and to buy and sell — safely.
              </p>
            </div>
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
          </div>
        </div>
      </section>
    </>
  );
}

function HeroStat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-3xl font-extrabold leading-none">
        {value}
        <span className="text-base font-semibold text-white/60 ml-1">{unit}</span>
      </dt>
      <dd className="mt-1 text-xs text-white/60">{label}</dd>
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
    <div>
      <div className={`h-1 w-12 rounded-full ${toneBar[tone]} mb-4`} />
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Next({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6">
      <span className="inline-block text-xs font-medium text-gold mb-3">
        In the works
      </span>
      <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}
