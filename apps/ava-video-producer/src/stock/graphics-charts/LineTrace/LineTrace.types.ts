import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { LineTraceInput } from "../../presets/LineTrace/LineTrace.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within LineTrace. */
export type Props = GraphicProps & { input: LineTraceInput };
/** Rendering data shared within LineTrace. */
export type Drawing = Props & {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  dash: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["dash"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  geometry: TraceGeometry;
};

/** Chart paths and head supplied to LineTrace layers. */
export type TraceGeometry = {
  points: Array<{ x: number; y: number }>;
  tracePath: string;
  referencePath: string;
  head: { x: number; y: number };
};
