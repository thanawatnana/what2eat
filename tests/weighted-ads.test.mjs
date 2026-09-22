import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../utils/weightedAds.js', import.meta.url), 'utf8');
const weightedAds = await import(`data:text/javascript,${encodeURIComponent(source)}`);

test('weighted ad selection follows cumulative payment ranges', () => {
  const ads = [
    { id: 'a', payment_amount: 1000 },
    { id: 'b', payment_amount: 500 },
  ];
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0).id, 'a');
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.65).id, 'a');
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.8).id, 'b');
});

test('weighted ad selection ignores invalid weights', () => {
  const ads = [
    { id: 'invalid-zero', payment_amount: 0 },
    { id: 'invalid-text', payment_amount: 'none' },
    { id: 'valid', payment_amount: 250 },
  ];
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.5).id, 'valid');
  assert.equal(weightedAds.pickWeightedAd([], () => 0.5), null);
});
