const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const CUISINE_NAMES = {
  thai: 'อาหารไทย',
  japanese: 'อาหารญี่ปุ่น',
  chinese: 'อาหารจีน',
  korean: 'อาหารเกาหลี',
  italian: 'อาหารอิตาเลียน',
  indian: 'อาหารอินเดีย',
  vietnamese: 'อาหารเวียดนาม',
  burger: 'เบอร์เกอร์',
  pizza: 'พิซซ่า',
  coffee_shop: 'คาเฟ่',
};

const MENU_BY_CUISINE = {
  thai: ['ข้าวกะเพรา', 'ข้าวผัด', 'ต้มยำ'],
  japanese: ['ราเมง', 'ข้าวหน้าญี่ปุ่น', 'ซูชิ'],
  chinese: ['ข้าวผัด', 'บะหมี่', 'ติ่มซำ'],
  korean: ['ข้าวเกาหลี', 'ไก่ทอดเกาหลี', 'ต๊อกบกกี'],
  italian: ['พาสต้า', 'พิซซ่า', 'สลัด'],
  indian: ['แกงอินเดีย', 'ข้าวหมก', 'แป้งนาน'],
  vietnamese: ['เฝอ', 'ปอเปี๊ยะ', 'ข้าวเวียดนาม'],
  burger: ['เบอร์เกอร์', 'เฟรนช์ฟรายส์', 'ไก่ทอด'],
  pizza: ['พิซซ่า', 'พาสต้า', 'สลัด'],
  coffee_shop: ['กาแฟ', 'ชา', 'เบเกอรี'],
};

const FALLBACK_MENUS = {
  cafe: ['กาแฟ', 'ชา', 'ขนมหวาน'],
  fast_food: ['ข้าวจานด่วน', 'ของทอด', 'เครื่องดื่ม'],
  food_court: ['ข้าวราดแกง', 'ก๋วยเตี๋ยว', 'อาหารตามสั่ง'],
  restaurant: ['อาหารจานเดียว', 'เมนูแนะนำของร้าน', 'เครื่องดื่ม'],
};

const toRadians = value => value * Math.PI / 180;

export const distanceInKm = (from, to) => {
  const radius = 6371;
  const latDistance = toRadians(to.latitude - from.latitude);
  const lngDistance = toRadians(to.longitude - from.longitude);
  const a = Math.sin(latDistance / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude))
    * Math.sin(lngDistance / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const cuisineKeys = tags => (tags.cuisine || '')
  .toLowerCase()
  .split(/[;,]/)
  .map(value => value.trim())
  .filter(Boolean);

const menusFor = tags => {
  const menus = cuisineKeys(tags).flatMap(key => MENU_BY_CUISINE[key] || []);
  return [...new Set(menus.length ? menus : FALLBACK_MENUS[tags.amenity] || FALLBACK_MENUS.restaurant)].slice(0, 3);
};

const categoryFor = tags => {
  const cuisine = cuisineKeys(tags)[0];
  if (cuisine) return CUISINE_NAMES[cuisine] || cuisine.replaceAll('_', ' ');
  if (tags.amenity === 'cafe') return 'คาเฟ่';
  if (tags.amenity === 'fast_food') return 'อาหารจานด่วน';
  if (tags.amenity === 'food_court') return 'ศูนย์อาหาร';
  return 'ร้านอาหาร';
};

const normalizeElement = (element, origin) => {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const tags = element.tags || {};
  const position = { latitude, longitude };
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return {
    id: `${element.type}-${element.id}`,
    name: tags['name:th'] || tags.name || 'ร้านอาหารใกล้คุณ',
    latitude,
    longitude,
    category: categoryFor(tags),
    menus: menusFor(tags),
    distanceKm: distanceInKm(origin, position),
    address: street || tags['addr:place'] || '',
    openingHours: tags.opening_hours || '',
    source: 'osm',
  };
};

export const createDemoPlaces = origin => [
  { id: 'demo-1', name: 'ร้านอาหารไทยตัวอย่าง', category: 'อาหารไทย', menus: ['ข้าวกะเพรา', 'ต้มยำ', 'ข้าวผัด'], lat: 0.0032, lng: 0.0018 },
  { id: 'demo-2', name: 'คาเฟ่ใกล้คุณ', category: 'คาเฟ่', menus: ['กาแฟ', 'ชา', 'เบเกอรี'], lat: -0.0021, lng: 0.0034 },
  { id: 'demo-3', name: 'ร้านอาหารจานด่วนตัวอย่าง', category: 'อาหารจานด่วน', menus: ['ข้าวจานด่วน', 'ไก่ทอด', 'เครื่องดื่ม'], lat: 0.0015, lng: -0.003 },
  { id: 'demo-4', name: 'ร้านก๋วยเตี๋ยวตัวอย่าง', category: 'ก๋วยเตี๋ยว', menus: ['ก๋วยเตี๋ยวน้ำ', 'ก๋วยเตี๋ยวแห้ง', 'ของทานเล่น'], lat: -0.0034, lng: -0.0016 },
].map(place => {
  const position = { latitude: origin.latitude + place.lat, longitude: origin.longitude + place.lng };
  return {
    ...place,
    ...position,
    distanceKm: distanceInKm(origin, position),
    address: '',
    openingHours: '',
    source: 'demo',
  };
});

export const fetchNearbyPlaces = async (origin, radiusMeters = 3000) => {
  const query = `[out:json][timeout:15];(
    node["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${origin.latitude},${origin.longitude});
    way["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${origin.latitude},${origin.longitude});
    relation["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${origin.latitude},${origin.longitude});
  );out center tags;`;
  let lastError;
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Nearby service returned ${response.status}`);
      const body = await response.json();
      return (body.elements || [])
        .map(element => normalizeElement(element, origin))
        .filter(Boolean)
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, 30);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Nearby service is unavailable');
};
