// Normalize Ghanaian phone numbers to a canonical 0XXXXXXXXX form so lookups
// match regardless of how the user typed the number (+233, 233, spaces, etc.).
export function normalizeGhPhone(raw: string): string {
  let digits = (raw ?? "").replace(/[^\d+]/g, "");
  digits = digits.replace(/^\+/, "");
  if (digits.startsWith("233")) {
    digits = "0" + digits.slice(3);
  }
  if (!digits.startsWith("0") && digits.length === 9) {
    digits = "0" + digits;
  }
  return digits;
}

// Loose validity check for a Ghanaian mobile number (10 digits starting with 0).
export function isLikelyGhPhone(raw: string): boolean {
  const n = normalizeGhPhone(raw);
  return /^0\d{9}$/.test(n);
}
