import type { Quote, SearchResult, IndexQuote } from "./types";
import { MockProvider } from "./mock-provider";
import { YahooProvider } from "./yahoo-provider";
const mock = new MockProvider();
const yahoo = new YahooProvider();
export async function getQuote(symbol: string): Promise<Quote | null> {
  return (await yahoo.getQuote(symbol)) || mock.getQuote(symbol);
}
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const out = await yahoo.getQuotes(symbols);
  return out.length ? out : mock.getQuotes(symbols);
}
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const out = await yahoo.search(query);
  return out.length ? out : mock.search(query);
}
export async function getIndices(): Promise<IndexQuote[]> {
  const out = await yahoo.getIndices();
  return out.length ? out : mock.getIndices();
}
