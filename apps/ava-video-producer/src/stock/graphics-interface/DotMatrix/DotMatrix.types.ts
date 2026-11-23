import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { DotMatrixInput } from "../../presets/DotMatrix/DotMatrix.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCohortGeometryFromInput } from "./getCohortGeometryFromInput";

/** Rendering data shared within DotMatrix. */
export type Props = GraphicProps & { input: DotMatrixInput };
/** Rendering data shared within DotMatrix. */
export type Drawing = Props & {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  cohort: ReturnType<typeof getCohortGeometryFromInput>;
};
