import { supabase } from '../supabase';

export const foodPreferenceKey = (source, foodId) => `${source}:${foodId}`;

export function preferencesToMap(rows) {
  return new Map(
    (rows || []).map((row) => [foodPreferenceKey(row.food_source, row.food_id), row]),
  );
}

export async function loadFoodPreferences(userId) {
  if (!userId) return new Map();
  const { data, error } = await supabase
    .from('food_preferences')
    .select('food_source, food_id, is_hidden, is_selected')
    .eq('user_id', userId);
  if (error) throw error;
  return preferencesToMap(data);
}

export function preferenceFor(preferences, food) {
  return preferences.get(foodPreferenceKey(food.source, food.id)) || {
    food_source: food.source,
    food_id: food.id,
    is_hidden: false,
    is_selected: true,
  };
}

export function isFoodHidden(preferences, food) {
  return Boolean(preferenceFor(preferences, food).is_hidden);
}

export function isFoodSelected(preferences, food) {
  const preference = preferenceFor(preferences, food);
  return food.source === 'custom' ? true : preference.is_selected !== false;
}

export function buildRandomPool(foods, preferences, selectedCategories = []) {
  return (foods || []).filter((food) => {
    if (isFoodHidden(preferences, food)) return false;
    if (food.source === 'system' && !isFoodSelected(preferences, food)) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(food.category)) return false;
    return true;
  });
}

export async function saveFoodPreference(userId, food, current, changes) {
  const next = {
    user_id: userId,
    food_source: food.source,
    food_id: food.id,
    is_hidden: Boolean(current?.is_hidden),
    is_selected: current?.is_selected !== false,
    ...changes,
  };
  const { error } = await supabase.from('food_preferences').upsert(next, {
    onConflict: 'user_id,food_source,food_id',
  });
  if (error) throw error;
  return next;
}
