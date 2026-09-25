export async function publicQuote(symbol: string) {
  const res = await fetch(`/api/public-finance?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) return null;
  return res.json();
}
