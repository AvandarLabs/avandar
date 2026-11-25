import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { ScanLinesInput } from "../../presets/ScanLines/ScanLines.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within ScanLines. */
export type Props = GraphicProps & {
  input: ScanLinesInput;
};
/** Rendering data shared within ScanLines. */
export type ScanDefinitionsData = {
  accent: Props["accent"];
  id: Props["id"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  corner: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["corner"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Rendering data shared within ScanLines. */
export type ScanHandleData = {
  accent: Props["accent"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  scanY: number;
};
/** Rendering data shared within ScanLines. */
export type ScannedRecordsData = {
  input: Props["input"];
  accent: Props["accent"];
  corner: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["corner"];
  fields: Props["input"]["fields"];
  scanY: number;
};
/** Rendering data shared within ScanLines. */
export type ScanBeamData = {
  accent: Props["accent"];
  id: Props["id"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  scanY: number;
};
