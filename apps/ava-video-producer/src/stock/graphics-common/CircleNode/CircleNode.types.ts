import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { NodeSize } from "../graphicCommon.types";

/** Rendering data shared within CircleNode. */
export type Props = {
  x: number;
  y: number;
  label: string;
  detail?: string;
  frame: number;
  index?: number;
  accent: string;
  active?: number;
  size?: NodeSize;
  radius?: number;
};
/** Rendering data shared within CircleNode. */
export type NodeRingsData = {
  x: Props["x"];
  y: Props["y"];
  accent: Props["accent"];
  active: number;
  node: ResolvedVideoComponents["Node"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  nodeRadius: number;
};
