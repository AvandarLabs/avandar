import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../BatteryDispatchBalance.schema";
import type {
  BatteryVesselDrawOnLengthValue,
  BatteryVesselLossChannelWidthValue,
} from "../BatteryVessel";
import type { ReactNode } from "react";

type Props = {
  itemKey: Array<
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["chargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["chargeLossKwh"];
      }
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["dischargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["dischargeLossKwh"];
      }
  >[number]["key"];
  path: Array<
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["chargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["chargeLossKwh"];
      }
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["dischargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["dischargeLossKwh"];
      }
  >[number]["path"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  drawOnLength: BatteryVesselDrawOnLengthValue;
  progress: Array<
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["chargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["chargeLossKwh"];
      }
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["dischargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["dischargeLossKwh"];
      }
  >[number]["progress"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  lossChannelWidth: BatteryVesselLossChannelWidthValue;
  value: Array<
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["chargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["chargeLossKwh"];
      }
    | {
        key: string;
        path: {
          charge: string;
          delivery: string;
          chargeLoss: string;
          dischargeLoss: string;
        }["dischargeLoss"];
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["cycle"]["dischargeLossKwh"];
      }
  >[number]["value"];
};

/** Renders the loss channel with authored geometry. */
export function BatteryVesselLossChannel({
  itemKey: key,
  path,
  tokens,
  drawOnLength: DRAW_ON_LENGTH,
  progress,
  scales,
  lossChannelWidth: LOSS_CHANNEL_WIDTH,
  value,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      key={key}
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      data-loss-channel={key}
      pathLength={DRAW_ON_LENGTH}
      strokeDasharray={DRAW_ON_LENGTH}
      strokeDashoffset={DRAW_ON_LENGTH - progress}
      stroke={tokens.color.highlight}
      strokeWidth={scales.stroke(LOSS_CHANNEL_WIDTH)}
      opacity={value ? 1 : 0}
      fill="none"
    />
  );
}
