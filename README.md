# Nkabom

**Nkabom** (Twi: *togetherness / unity*) is a trust & safety network for Ghana. It
helps ordinary people avoid fraud: paste any suspicious SMS, WhatsApp message, or
offer and Nkabom tells you whether it's a scam — explained in **Twi, Ga, Ewe,
Hausa, Pidgin or English** — or look up a Mobile Money number to see its
community trust score.

This is **system 2 of two** Ghana-focused products (the first is [`banbo`](https://github.com/Eselase-Noble/banbo),
a security scanner). The first shipped pillar is the **Scam & Trust Shield**; an
AI assistant and a safe social marketplace are planned.

## Features (v1)

- **Scam checker** — paste a message, pick the channel and your language, and get
  a risk verdict (safe / caution / danger) with a 0–100 score, the red flags
  detected, a plain-language explanation, and what to do next.
- **Number lookup** — check a Mobile Money / phone number against a community
  trust database (trust score, verification, scam reports).
- **Works with or without AI** — with a Claude API key it uses `claude-opus-4-8`
  for nuanced, local-language analysis; without one it falls back to a built-in
  heuristic so the tool always works.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Prisma ORM + SQLite (swap the datasource to Postgres for production)
- Anthropic SDK (`@anthropic-ai/sdk`) for scam analysis

## Getting started

```bash
npm install

# set up the database
cp .env.example .env            # then edit if needed
npx prisma db push              # create the SQLite schema
npx prisma generate             # generate the client
node prisma/seed.mjs            # seed sample sellers for the number lookup

npm run dev                     # http://localhost:3000
```

### Enable AI analysis (optional)

Add a Claude API key to `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

Without it, the scam checker uses the offline heuristic analyzer.

## Project layout

```
prisma/schema.prisma      Seller, Report, ScamCheck models
prisma/seed.mjs           sample seller data
src/lib/scam.ts           AI + heuristic scam analysis
src/lib/db.ts             Prisma client singleton
src/lib/phone.ts          Ghana phone-number normalization
src/app/api/scam-check    POST — analyze a message
src/app/api/trust         GET  — look up a number
src/components/ScamShield.tsx   the lead feature UI
```

## Disclaimer

Nkabom gives **guidance, not a guarantee**. Always verify before you pay or share
your Mobile Money PIN with anyone.
