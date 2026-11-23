import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getZoneShadeFromInputAndFrame } from "../getZoneShadeFromInputAndFrame";
import type { Input } from "../PopulationNormalizedMap.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
  lift: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  zone: Options["zone"];
  index: Options["index"];
  frame: Options["frame"];
  accent: Options["accent"];
  lift: Options["lift"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  points: string;
  first: [number, number];
  rate: number;
  opacity: number;
};

/** Returns zone lid geometry, lift, rate, and opacity for `ZoneLid`. */
export function useZoneLidPresentation({
  zone,
  index,
  input,
  frame,
  accent,
  lift,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const points = zone.polygon
    .map(([x, y]) => {
      return `${55 + x * 5},${180 + y * 2.5}`;
    })
    .join(" ");
  const first = zone.polygon[0];
  const { rate, opacity } = getZoneShadeFromInputAndFrame({
    zone,
    input,
    frame,
    motion,
  });
  return {
    zone,
    index,
    frame,
    accent,
    lift,
    tokens,
    points,
    first,
    rate,
    opacity,
  };
}
