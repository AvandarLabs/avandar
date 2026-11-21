import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BatteryCasing } from "./BatteryCasing/BatteryCasing";
import { BatteryLossChannels } from "./BatteryLossChannels/BatteryLossChannels";
import { BatteryStorageFill } from "./BatteryStorageFill/BatteryStorageFill";
import { BatteryTerminal } from "./BatteryTerminal/BatteryTerminal";
import { BatteryVesselChargePath } from "./BatteryVesselChargePath/BatteryVesselChargePath";
import { BatteryVesselDeliveryPath } from "./BatteryVesselDeliveryPath/BatteryVesselDeliveryPath";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

type BatteryChargeState = {
  charge: number;
  dispatch: number;
  cycle: Input["cycle"];
  x: number;
  y: number;
  fillHeight: number;
  paths: BatteryPaths;
};
type BatteryPaths = {
  charge: string;
  delivery: string;
  chargeLoss: string;
  dischargeLoss: string;
};

/** Inputs for BatteryVessel. */
type Props = { frame: number; accent: string; input: Input };
const DRAW_ON_LENGTH = 1;
const CHANNEL_WIDTH = 8;
const LOSS_CHANNEL_WIDTH = 5;

type GetBatteryChargeStateOptions = {
  frame: number;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored battery charge state. */
function _getBatteryChargeState({
  frame,
  input,
  motion,
}: Readonly<GetBatteryChargeStateOptions>): BatteryChargeState {
  const charge = motion.ramp(frame, 36, motion.scale(30), motion.travel.easing),
    dispatch = motion.ramp(frame, 80, motion.scale(28), motion.travel.easing);
  const { battery, cycle } = input;
  const peak =
    battery.initialStoredKwh + cycle.chargeInputKwh - cycle.chargeLossKwh;
  const final = peak - cycle.deliveredKwh - cycle.dischargeLossKwh;
  const stored = dispatch
    ? interpolateFiniteRange({ from: peak, to: final, progress: dispatch })
    : interpolateFiniteRange({
        from: battery.initialStoredKwh,
        to: peak,
        progress: charge,
      });
  const vertical = input.orientation === "vertical",
    x = vertical ? 320 : 398,
    y = vertical ? 195 : 220;
  const fillHeight = 150 * (stored / battery.capacityKwh);
  const paths = _createBatteryPathsFromOrientation({ vertical });
  return { charge, dispatch, cycle, x, y, fillHeight, paths };
}

/** Builds the charge, delivery and loss routes for the selected orientation. */
function _createBatteryPathsFromOrientation({
  vertical,
}: Readonly<CreateBatteryPathsFromOrientationOptions>): BatteryPaths {
  return vertical
    ? {
        charge: "M 400 165 V 195",
        delivery: "M 400 365 V 400",
        chargeLoss: "M 400 180 H 470",
        dischargeLoss: "M 400 380 H 470",
      }
    : {
        charge: "M 76 290 H 398",
        delivery: "M 562 290 H 884",
        chargeLoss: "M 310 290 Q 340 290 340 345 H 280",
        dischargeLoss: "M 650 290 Q 620 290 620 345 H 680",
      };
}

/**
 * Charge and dispatch paths have distinct boundaries and separately timed
 * losses.
 */
export function BatteryVessel({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { charge, dispatch, cycle, x, y, fillHeight, paths } =
    _getBatteryChargeState({ frame, input, motion });
  return (
    <g>
      <BatteryTerminal {...{ x, y, tokens }} />
      <BatteryCasing {...{ x, y, scales, tokens }} />
      <BatteryStorageFill {...{ x, y, fillHeight, accent, atomic }} />
      <BatteryVesselChargePath
        paths={paths}
        tokens={tokens}
        drawOnLength={DRAW_ON_LENGTH}
        {...{ charge, accent, scales, cycle }}
        channelWidth={CHANNEL_WIDTH}
        atomic={atomic}
      />
      <BatteryVesselDeliveryPath
        paths={paths}
        tokens={tokens}
        drawOnLength={DRAW_ON_LENGTH}
        {...{ dispatch, scales, cycle }}
        channelWidth={CHANNEL_WIDTH}
        atomic={atomic}
      />
      <BatteryLossChannels
        {...{ input, paths, charge, cycle, dispatch, tokens }}
        drawOnLength={DRAW_ON_LENGTH}
        scales={scales}
        lossChannelWidth={LOSS_CHANNEL_WIDTH}
      />
    </g>
  );
}

/** The type of `DRAW_ON_LENGTH` used by BatteryVessel. */
export type BatteryVesselDrawOnLengthValue = typeof DRAW_ON_LENGTH;

/** The type of `CHANNEL_WIDTH` used by BatteryVessel. */
export type BatteryVesselChannelWidthValue = typeof CHANNEL_WIDTH;
/** The type of `LOSS_CHANNEL_WIDTH` used by BatteryVessel. */
export type BatteryVesselLossChannelWidthValue = typeof LOSS_CHANNEL_WIDTH;

type CreateBatteryPathsFromOrientationOptions = {
  vertical: boolean;
};
