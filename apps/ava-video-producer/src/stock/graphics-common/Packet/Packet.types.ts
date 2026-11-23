import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { cubicPoint } from "../cubicPoint";
import type { Point } from "../graphicCommon.types";

/** Rendering data shared within Packet. */
export type Props = {
  frame: number;
  from: Point;
  to: Point;
  color: string;
  delay?: number;
  period?: number;
  size?: "sm" | "md";
  /** An authored radius override for presets that need a fixed size. */
  radius?: number;
  bend?: number;
};
/** Rendering data shared within Packet. */
export type GetPacketPointAndOpacityOptions = {
  frame: Props["frame"];
  from: Props["from"];
  to: Props["to"];
  delay: number;
  bend: number;
  packet: ResolvedVideoComponents["Packet"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Rendering data shared within Packet. */
export type GetPacketPointAndOpacityResult = {
  point: ReturnType<typeof cubicPoint>;
  opacity: number;
};
