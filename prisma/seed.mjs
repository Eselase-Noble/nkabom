// Seed a few sellers so the "Check a number" lookup has data to show.
// Run with: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const sellers = [
  {
    name: "Ama Serwaa",
    businessName: "Serwaa Fabrics & Textiles",
    phone: "0244000111",
    region: "Greater Accra",
    verified: true,
    trustScore: 88,
    reports: [{ kind: "praise", note: "Delivered on time, exactly as described." }],
  },
  {
    name: "Yaa Boateng",
    businessName: "Yaa's Thrift Boutique",
    phone: "0557654321",
    region: "Ashanti",
    verified: false,
    trustScore: 61,
    reports: [],
  },
  {
    name: "Kwame Owusu",
    businessName: "Quick Deals GH",
    phone: "0201112222",
    region: "Greater Accra",
    verified: false,
    trustScore: 24,
    reports: [
      { kind: "scam", note: "Took deposit for a phone, blocked me after." },
      { kind: "scam", note: "Fake MoMo promo, asked for my PIN." },
      { kind: "complaint", note: "Never delivered." },
    ],
  },
  {
    name: "Kojo Tetteh",
    businessName: "Tetteh Phones & Accessories",
    phone: "0264445555",
    region: "Central",
    verified: false,
    trustScore: 39,
    reports: [{ kind: "scam", note: "Sold a faulty charger, refused refund." }],
  },
];

async function main() {
  for (const s of sellers) {
    const { reports, ...data } = s;
    await db.seller.upsert({
      where: { phone: data.phone },
      update: data,
      create: {
        ...data,
        reports: { create: reports },
      },
    });
  }
  const count = await db.seller.count();
  console.log(`Seeded sellers. Total in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
