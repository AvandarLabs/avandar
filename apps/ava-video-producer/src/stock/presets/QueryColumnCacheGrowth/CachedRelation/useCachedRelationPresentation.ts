import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCacheSceneFromFrame } from "../getCacheSceneFromFrame";
import type { Input } from "../QueryColumnCacheGrowth.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  scene: ReturnType<typeof getCacheSceneFromFrame>;
  frame: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  scene: Options["scene"];
  accent: Options["accent"];
  style: {
    readonly tableRadius: number;
    readonly tableStrokeWidth: number;
    readonly gridStrokeWidth: number;
    readonly missingDash: readonly number[];
    readonly missingStrokeWidth: number;
    readonly cardRadius: number;
    readonly cardStrokeWidth: number;
    readonly checkWidth: number;
    readonly routeStrokeWidth: number;
    readonly portRadius: number;
  };
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  columns: Array<{ id: string; label: string; cells: string[] }>;
};

/**
 * Returns the visible original or union columns and their theme values for
 * `CachedRelationFrame`, `CachedRelation`.
 */
export function useCachedRelationPresentation({
  input,
  scene,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "QueryColumnCacheGrowth",
    props: {},
  });
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const columns = frame < 106 ? scene.original : scene.union;
  return { input, scene, accent, style, scales, color, columns };
}
