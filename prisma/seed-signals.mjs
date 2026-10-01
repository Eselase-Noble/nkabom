// Seed the online keyword model with diverse, realistic scam vs. safe messages
// so the "scams going around" feed reads cleanly from day one. Run:
//   node prisma/seed-signals.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const STOP = new Set(
  (
    "a an and are as at be been being but by can cant could did do does doing done dont for from had has have having her here hers him his how i if in into is it its just like make me my no not now of off on once only or our out over own per put re see so some such than that the their them then there these they this those to too under until up us use using very was we were what when where which while who whom why will with would you your yours all any been get got new one out via way well also more most much many back come goes went good day today"
  ).split(/\s+/),
);
const meaningful = (t) =>
  t.startsWith("num:") ? true : !/^\d+$/.test(t) && t.length >= 3 && t.length <= 24 && !STOP.has(t);

function extractNumbers(text) {
  const out = new Set();
  for (const m of text.match(/(?:\+?233|0)\s?\d(?:[\s-]?\d){8}/g) ?? []) {
    const n = m.replace(/[^\d]/g, "").replace(/^233/, "0");
    if (/^0\d{9}$/.test(n)) out.add("num:" + n);
  }
  return [...out];
}
function tokenize(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9₵+\s]/g, " ").split(/\s+/).filter(meaningful);
  return [...new Set([...words, ...extractNumbers(text)])];
}

const SCAM = [
  "Congratulations! Your MTN number won GHS 5000 in the promo. Send your PIN to claim.",
  "Dear customer, your MoMo wallet will be blocked. Reactivate by sending your PIN now.",
  "You have been selected for a cash grant. Pay a GHS 50 activation fee to receive it.",
  "Invest GHS 500 and earn GHS 2000 in three days. Guaranteed returns, limited slots.",
  "This is MTN customer care. We sent money to your number by mistake, please reverse it.",
  "Job offer: work from home and earn GHS 3000 weekly. Pay a registration fee to start.",
  "Your account won a promo bonus. Click the link to verify your details and claim.",
  "Telecel alert: confirm your SIM or your line will be deactivated. Reply with your PIN.",
];
const SAFE = [
  "Hi, are we still meeting at 3pm today?",
  "Your order has been delivered. Thank you for shopping with us.",
  "Please send me the notes for tomorrow's class.",
  "Happy birthday! Have a great day.",
  "The meeting has moved to Thursday at the office.",
  "Can you call me when you reach home?",
];

async function bump(text, label) {
  const field = label === "scam" ? "scamCount" : "safeCount";
  for (const term of tokenize(text)) {
    await db.learnedSignal.upsert({
      where: { term },
      create: { term, scamCount: label === "scam" ? 1 : 0, safeCount: label === "safe" ? 1 : 0 },
      update: { [field]: { increment: 1 } },
    });
  }
}

async function main() {
  await db.learnedSignal.deleteMany({}); // clear test-polluted signals
  for (const m of SCAM) await bump(m, "scam");
  for (const m of SAFE) await bump(m, "safe");
  const total = await db.learnedSignal.count();
  console.log(`Seeded signals. LearnedSignal rows: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
