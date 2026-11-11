import { useContinuityCopy } from "../../../useContinuityCopy";

/** Display names for the catalog's film and study categories. */
const CATEGORY_LABELS: Record<string, string> = {
  "motion-motion": "Motion to motion",
  "motion-product": "Motion to product",
  "product-motion": "Product to motion",
  composite: "Product and motion",
  "scene-films": "Storyboard scenes",
  transitions: "Transitions",
  compositing: "Compositing",
  compositions: "Composition recipes",
  "scene-motions": "Scene motions",
};

/** Translate a catalog category id into its display name. */
export function useCategoryLabel() {
  const translate = useContinuityCopy();
  return (category: string) => translate(CATEGORY_LABELS[category] ?? category);
}
