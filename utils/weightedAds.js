export function validWeightedAds(ads) {
  return (Array.isArray(ads) ? ads : []).filter((ad) => {
    const weight = Number(ad?.payment_amount);
    return Number.isFinite(weight) && weight > 0;
  });
}

export function pickWeightedAd(ads, random = Math.random) {
  const candidates = validWeightedAds(ads);
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce(
    (sum, ad) => sum + Number(ad.payment_amount),
    0,
  );
  const target = Math.min(Math.max(Number(random()), 0), 0.999999999999) * totalWeight;
  let cumulativeWeight = 0;

  for (const ad of candidates) {
    cumulativeWeight += Number(ad.payment_amount);
    if (target < cumulativeWeight) return ad;
  }

  return candidates[candidates.length - 1];
}
