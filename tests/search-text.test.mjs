import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchText } from '../src/lib/search-text.ts';

test('search ignores Spanish accents, whitespace and case', () => {
  assert.equal(normalizeSearchText('  América Móvil '), 'AMERICA MOVIL');
  assert.equal(normalizeSearchText('México'), normalizeSearchText('mexico'));
  assert.equal(normalizeSearchText(''), '');
});
test('search preserves ticker punctuation', () => {
  assert.equal(normalizeSearchText(' amxl.mx '), 'AMXL.MX');
  assert.equal(normalizeSearchText('PBR-A'), 'PBR-A');
});
