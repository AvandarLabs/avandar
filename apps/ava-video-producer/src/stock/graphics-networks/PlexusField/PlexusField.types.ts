import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { PlexusFieldInput } from "../../presets/PlexusField/PlexusField.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within PlexusField. */
export type Props = GraphicProps & { input: PlexusFieldInput };
/** Rendering data shared within PlexusField. */
export type Point = { x: number; y: number };
/** Rendering data shared within PlexusField. */
export type Drawing = Props & {
  style: ResolvedVideoComponents["PlexusField"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  margin: number;
  right: number;
  points: Point[];
};
