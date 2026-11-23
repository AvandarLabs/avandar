import { BatteryVesselLossChannel } from "../BatteryVesselLossChannel/BatteryVesselLossChannel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../BatteryDispatchBalance.schema";
import type {
  BatteryVesselDrawOnLengthValue,
  BatteryVesselLossChannelWidthValue,
} from "../BatteryVessel";
import type { ReactNode } from "react";

type BatteryFlowPaths = {
  charge: string;
  delivery: string;
  chargeLoss: string;
  dischargeLoss: string;
};

type BatteryLossChannel = {
  key: string;
  path: string;
  progress: number;
  value: number;
};
/** Associates charge and discharge losses with their separate routes. */
function _getBatteryLossChannels({
  paths,
  charge,
  cycle,
  dispatch,
}: Readonly<
  Pick<Props, "paths" | "charge" | "cycle" | "dispatch">
>): BatteryLossChannel[] {
  return [
    {
      key: "charge",
      path: paths.chargeLoss,
      progress: charge,
      value: cycle.chargeLossKwh,
    },
    {
      key: "discharge",
      path: paths.dischargeLoss,
      progress: dispatch,
      value: cycle.dischargeLossKwh,
    },
  ];
}

type Props = {
  input: Input;
  paths: BatteryFlowPaths;
  charge: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
  cycle: Input["cycle"];
  dispatch: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  drawOnLength: BatteryVesselDrawOnLengthValue;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  lossChannelWidth: BatteryVesselLossChannelWidthValue;
};

/** Renders the outline with authored geometry. */
export function BatteryLossChannels({
  input,
  paths,
  charge,
  cycle,
  dispatch,
  tokens,
  drawOnLength: DRAW_ON_LENGTH,
  scales,
  lossChannelWidth: LOSS_CHANNEL_WIDTH,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showLossChannels ? (
        <g>
          {_getBatteryLossChannels({ paths, charge, cycle, dispatch }).map(
            ({ key, path, progress, value }) => {
              return (
                <BatteryVesselLossChannel
                  key={key}
                  itemKey={key}
                  path={path}
                  tokens={tokens}
                  drawOnLength={DRAW_ON_LENGTH}
                  progress={progress}
                  scales={scales}
                  lossChannelWidth={LOSS_CHANNEL_WIDTH}
                  value={value}
                />
              );
            },
          )}
        </g>
      ) : undefined}
    </>
  );
}
