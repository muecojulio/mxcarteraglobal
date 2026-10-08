import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSearchText } from '../src/lib/search-text.ts';
import {
  SIC_STOCKS,
  SIC_ETFS,
  SIC_UCITS,
  SIC_ALL,
  searchSic,
  isSicSymbol,
} from '../src/lib/sic-catalog.ts';
import {
  MX_UNIVERSE,
  searchMxUniverse,
  isInMxUniverse,
  normalizeMxSymbol,
} from '../src/lib/mx-universe.ts';
import { buildCatalogIndex } from '../src/lib/catalog-index.ts';
import { normalizeYahooSymbol } from '../src/lib/market-data/types.ts';

/**
 * Referencia: el escaneo lineal EXACTO que había antes del índice.
 * Si el índice se desvía un solo ítem de esto, el test falla.
 */
function bruteSic(items, needles) {
  return items.filter((item) =>
    needles.some(
      (needle) =>
        item.symbol.toUpperCase().includes(needle) ||
        normalizeSearchText(item.name).includes(needle)
    )
  );
}

function bruteMx(items, needles) {
  return items.filter((item) =>
    needles.some(
      (needle) =>
        item.symbol.toUpperCase().includes(needle) ||
        normalizeSearchText(item.name).includes(needle) ||
        item.symbol.replace(/\.MX$/, '').includes(needle)
    )
  );
}

function needlesFor(q) {
  const raw = normalizeSearchText(q);
  if (!raw) return null;
  return [...new Set([raw, normalizeYahooSymbol(raw)])];
}

/** Batería de consultas: símbolos, nombres, palabras, prefijos y fragmentos. */
function queryBattery(items) {
  const qs = new Set();
  for (const it of items) {
    qs.add(it.symbol);
    qs.add(it.symbol.toLowerCase());
    qs.add(it.name);
    const clean = normalizeSearchText(it.name);
    for (const w of clean.split(' ').filter((w) => w.length > 0)) {
      qs.add(w);
      qs.add(w.toLowerCase());
      for (let n = 1; n <= Math.min(w.length, 6); n++) qs.add(w.slice(0, n));
    }
    // Fragmentos internos: fuerzan el camino de trigramas intermedios.
    for (let n = 0; n + 3 <= clean.length; n += 7) qs.add(clean.slice(n, n + 3));
  }
  qs.add('');
  qs.add('  ');
  qs.add('AMÉRICA');
  qs.add('america movil');
  qs.add('ETF');
  qs.add('Ñ');
  qs.add('zzz-no-existe');
  qs.add('A.M');
  return [...qs];
}

const SIC_POOLS = {
  undefined: SIC_ALL,
  stock: SIC_STOCKS,
  etf: [...SIC_ETFS, ...SIC_UCITS],
  ucits: SIC_UCITS,
};

test('searchSic indexado == escaneo lineal, en todos los pools y consultas', () => {
  const queries = queryBattery(SIC_ALL);
  let compared = 0;
  for (const [kind, pool] of Object.entries(SIC_POOLS)) {
    const poolKind = kind === 'undefined' ? undefined : kind;
    for (const q of queries) {
      const expected = needlesFor(q)
        ? bruteSic(pool, needlesFor(q))
        : pool;
      const actual = searchSic(q, poolKind);
      assert.deepEqual(
        actual.map((i) => i.symbol),
        expected.map((i) => i.symbol),
        `searchSic("${q}", ${kind}) divergió del escaneo lineal`
      );
      compared++;
    }
  }
  assert.ok(compared > 10000, `comparaciones insuficientes: ${compared}`);
});

/** Réplica fiel del searchMxUniverse original (escaneo lineal + mezcla SIC). */
function bruteSearchMxUniverse(q, limit = 20) {
  const raw = normalizeSearchText(q);
  if (!raw) return [];
  const canonical = normalizeYahooSymbol(raw);
  const nd = [...new Set([raw, canonical])];
  const local = bruteMx(MX_UNIVERSE, nd);
  const fromSic = bruteSic(SIC_ALL, nd).map((i) => ({
    symbol: i.symbol,
    name: i.name,
    kind: i.kind === 'etf' ? 'etf' : 'stock',
    venue: 'SIC',
  }));
  const map = new Map();
  for (const i of [...local, ...fromSic]) map.set(i.symbol.toUpperCase(), i);
  return [...map.values()].slice(0, limit);
}

test('searchMxUniverse indexado == escaneo lineal', () => {
  const queries = queryBattery(MX_UNIVERSE);
  let compared = 0;
  for (const q of queries) {
    const expected = bruteSearchMxUniverse(q, 20).map((i) => `${i.symbol}|${i.name}`);
    const actual = searchMxUniverse(q, 20).map((i) => `${i.symbol}|${i.name}`);
    assert.deepEqual(
      actual,
      expected,
      `searchMxUniverse("${q}") divergió del escaneo lineal`
    );
    compared++;
  }
  assert.ok(compared > 1000, `comparaciones insuficientes: ${compared}`);
});

test('isSicSymbol indexado == escaneo lineal sobre todo el catálogo', () => {
  for (const probe of queryBattery(SIC_ALL)) {
    const s = normalizeMxSymbol(probe).replace(/\.MX$/, '');
    const expected = SIC_ALL.some((i) => i.symbol.toUpperCase() === s);
    assert.equal(
      isSicSymbol(probe),
      expected,
      `isSicSymbol("${probe}") divergió`
    );
  }
});

test('isInMxUniverse indexado == escaneo lineal sobre todo el catálogo', () => {
  for (const probe of queryBattery(MX_UNIVERSE)) {
    const s = normalizeMxSymbol(probe);
    const bare = s.replace(/\.MX$/, '');
    const expected =
      isSicSymbol(bare) ||
      isSicSymbol(s) ||
      MX_UNIVERSE.some(
        (i) =>
          i.symbol.toUpperCase() === s ||
          i.symbol.toUpperCase().replace(/\.MX$/, '') === bare
      );
    assert.equal(
      isInMxUniverse(probe),
      expected,
      `isInMxUniverse("${probe}") divergió`
    );
  }
});

test('el índice devuelve las mismas coincidencias que un índice construido a mano', () => {
  const items = [
    { symbol: 'AMXL.MX', name: 'América Móvil' },
    { symbol: 'PE&OLES.MX', name: 'Peñoles' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway B' },
  ];
  const idx = buildCatalogIndex(items, (i) => [i.symbol.replace(/\.MX$/, '')]);
  assert.deepEqual(
    idx.search(['MOVI']).map((i) => i.symbol),
    ['AMXL.MX']
  );
  // Sin acentos y coincidiendo por símbolo sin sufijo.
  assert.deepEqual(
    idx.search(['AMERICA']).map((i) => i.symbol),
    ['AMXL.MX']
  );
  assert.deepEqual(
    idx.search(['AMXL']).map((i) => i.symbol),
    ['AMXL.MX']
  );
  assert.deepEqual(idx.search(['PENOL']).map((i) => i.symbol), ['PE&OLES.MX']);
  // Aguja de 2 caracteres: cae al escaneo completo y aún coincide.
  assert.deepEqual(
    idx.search(['BE']).map((i) => i.symbol),
    ['BRK-B']
  );
  // Sin coincidencias.
  assert.deepEqual(idx.search(['ZZZ']).map((i) => i.symbol), []);
  // Orden del catálogo conservado con agujas múltiples (OR).
  assert.deepEqual(
    idx.search(['AAPL', 'AMERICA']).map((i) => i.symbol),
    ['AMXL.MX', 'AAPL']
  );
  assert.equal(idx.hasSymbol('AAPL'), true);
  assert.equal(idx.hasSymbol('AAPL.MX'), false);
});

test('el índice es más rápido que re-normalizar el catálogo en cada consulta', () => {
  const queries = queryBattery(MX_UNIVERSE).slice(0, 400).filter((q) => q.trim());
  const nd = queries.map((q) => needlesFor(q)).filter(Boolean);

  const t0 = process.hrtime.bigint();
  for (const n of nd) bruteMx(MX_UNIVERSE, n);
  const bruteMs = Number(process.hrtime.bigint() - t0) / 1e6;

  const idx = buildCatalogIndex(MX_UNIVERSE, (i) => [i.symbol.replace(/\.MX$/, '')]);
  const t1 = process.hrtime.bigint();
  for (const n of nd) idx.search(n);
  const indexMs = Number(process.hrtime.bigint() - t1) / 1e6;

  console.log(
    `  catálogo=${MX_UNIVERSE.length} ítems · ${nd.length} consultas · ` +
      `escaneo=${bruteMs.toFixed(1)}ms · índice=${indexMs.toFixed(1)}ms ` +
      `(${(bruteMs / indexMs).toFixed(1)}x)`
  );
  assert.ok(
    indexMs < bruteMs,
    `el índice (${indexMs}ms) no mejoró el escaneo (${bruteMs}ms)`
  );
});
