import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { StatusCycleInput } from "../../presets/StatusCycle/StatusCycle.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within StatusCycle. */
export type Props = GraphicProps & { input: StatusCycleInput };
/** Rendering data shared within StatusCycle. */
export type Drawing = Props & {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  states: Array<StatusCycleInput["states"][number]>;
  processing: number;
  complete: number;
  progress: number;
};
