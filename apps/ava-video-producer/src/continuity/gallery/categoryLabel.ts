/**
 * Display names for the catalog's film and study categories. A
 * "reenactment" is real Avandar UI performed programmatically from fixture
 * state, never a recording; see `docs/video-producer-nomenclature.md`.
 */
const CATEGORY_LABELS: Record<string, string> = {
  "motion-motion": "Motion to motion",
  "motion-product": "Motion to reenactment",
  "product-motion": "Reenactment to motion",
  composite: "Motion over reenactment",
  "scene-films": "Storyboard scenes",
  transitions: "Transitions",
  compositing: "Compositing",
  compositions: "Composition recipes",
  "entrances-and-reveals": "Entrances and reveals",
};

/**
 * The display name for a catalog category id, or the id itself when it has
 * none.
 */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
