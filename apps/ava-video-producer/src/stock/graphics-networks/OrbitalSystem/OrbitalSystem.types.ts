import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { OrbitalSystemInput } from "../../presets/OrbitalSystem/OrbitalSystem.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within OrbitalSystem. */
export type Props = GraphicProps & {
  input: OrbitalSystemInput;
};
/** Rendering data shared within OrbitalSystem. */
export type OrbitalCoreData = {
  accent: Props["accent"];
  style: ResolvedVideoComponents["OrbitalSystem"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Rendering data shared within OrbitalSystem. */
export type OrbitalPulseData = {
  frame: Props["frame"];
  accent: Props["accent"];
  style: ResolvedVideoComponents["OrbitalSystem"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
