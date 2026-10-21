export const RECOMMENDATION_MODE_KEY = "prisma:recommendation-mode";
export const RECOMMENDATION_MODES = Object.freeze(["balanced", "affinity", "variety"]);
export const DEFAULT_RECOMMENDATION_MODE = "balanced";

export function createRecommendationPreferences(getStorage) {
  function getMode() {
    try {
      const storage = getStorage();
      const stored = storage && storage.getItem(RECOMMENDATION_MODE_KEY);
      return RECOMMENDATION_MODES.includes(stored) ? stored : DEFAULT_RECOMMENDATION_MODE;
    } catch {
      return DEFAULT_RECOMMENDATION_MODE;
    }
  }

  function setMode(mode) {
    if (!RECOMMENDATION_MODES.includes(mode)) return getMode();
    try {
      const storage = getStorage();
      if (storage) storage.setItem(RECOMMENDATION_MODE_KEY, mode);
    } catch {
      // A blocked localStorage must never block discovery.
    }
    return mode;
  }

  return { getMode, setMode };
}
