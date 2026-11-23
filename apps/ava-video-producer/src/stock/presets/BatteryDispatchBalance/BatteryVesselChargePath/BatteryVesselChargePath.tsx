import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../BatteryDispatchBalance.schema";
import type {
  BatteryVesselDrawOnLengthValue,
  BatteryVesselChannelWidthValue,
} from "../BatteryVessel";
import type { ReactNode } from "react";

type BatteryFlowPaths = {
  charge: string;
  delivery: string;
  chargeLoss: string;
  dischargeLoss: string;
};

type Props = {
  paths: BatteryFlowPaths;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  drawOnLength: BatteryVesselDrawOnLengthValue;
  charge: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  cycle: Input["cycle"];
  channelWidth: BatteryVesselChannelWidthValue;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the charge path with authored geometry. */
export function BatteryVesselChargePath({
  paths,
  tokens,
  drawOnLength: DRAW_ON_LENGTH,
  charge,
  accent,
  scales,
  cycle,
  channelWidth: CHANNEL_WIDTH,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "path", d: paths.charge }}
      profile={tokens.sketch.shape}
      data-charge-path="true"
      pathLength={DRAW_ON_LENGTH}
      strokeDasharray={DRAW_ON_LENGTH}
      strokeDashoffset={DRAW_ON_LENGTH - charge}
      stroke={accent}
      strokeWidth={scales.stroke(
        cycle.chargeInputKwh ? CHANNEL_WIDTH : tokens.stroke.hairline,
      )}
      opacity={cycle.chargeInputKwh ? 1 : atomic.opacity["20"]}
      fill="none"
    />
  );
}
