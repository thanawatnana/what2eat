import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../utils/weightedAds.js', import.meta.url), 'utf8');
const weightedAds = await import(`data:text/javascript,${encodeURIComponent(source)}`);

test('weighted ad selection follows package priority ranges', () => {
  const ads = [
    { id: 'a', priority_weight: 2 },
    { id: 'b', priority_weight: 1 },
  ];
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0).id, 'a');
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.65).id, 'a');
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.8).id, 'b');
});

test('weighted ad selection ignores invalid weights', () => {
  const ads = [
    { id: 'invalid-zero', priority_weight: 0 },
    { id: 'invalid-text', priority_weight: 'none' },
    { id: 'valid', priority_weight: 4 },
  ];
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.5).id, 'valid');
  assert.equal(weightedAds.pickWeightedAd([], () => 0.5), null);
});

test('legacy ads still use payment amount when no package weight exists', () => {
  const ads = [{ id: 'legacy', payment_amount: 250 }];
  assert.equal(weightedAds.pickWeightedAd(ads, () => 0.5).id, 'legacy');
});
