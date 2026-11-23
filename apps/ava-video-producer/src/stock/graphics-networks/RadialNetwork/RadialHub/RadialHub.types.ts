import type { ResolvedVideoComponents } from "../../../../videoTheme/videoTheme.types";
import type { RadialNetworkInput } from "../../../presets/RadialNetwork/RadialNetwork.schema";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within RadialHub. */
export type Props = {
  input: RadialNetworkInput;
  frame: number;
  accent: string;
};
/** Rendering data shared within RadialHub. */
export type HubLabelsData = {
  input: Props["input"];
  accent: Props["accent"];
  style: ResolvedVideoComponents["RadialNetwork"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
