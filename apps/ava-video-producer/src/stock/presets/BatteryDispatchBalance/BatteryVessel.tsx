import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for BatteryVessel. */
type Props = { frame: number; accent: string; input: Input };
const DRAW_ON_LENGTH = 1;
const CHANNEL_WIDTH = 8;
const LOSS_CHANNEL_WIDTH = 5;

/**
 * Charge and dispatch paths have distinct boundaries and separately timed
 * losses.
 */
export function BatteryVessel({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
  const paths = vertical
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
  return (
    <g>
      <rect
        x={x + 58}
        y={y - 8}
        width={48}
        height={8}
        fill={tokens.color.line}
      />
      <StockRect
        x={x}
        y={y}
        width={164}
        height={170}
        rx={scales.corner(tokens.corner.card)}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <rect
        data-battery-fill="true"
        x={x + 10}
        y={y + 160 - fillHeight}
        width={144}
        height={fillHeight}
        fill={accent}
        fillOpacity={atomic.opacity["65"]}
      />
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
      <SketchedShape
        shape={{ kind: "path", d: paths.delivery }}
        profile={tokens.sketch.shape}
        data-delivery-path="true"
        pathLength={DRAW_ON_LENGTH}
        strokeDasharray={DRAW_ON_LENGTH}
        strokeDashoffset={DRAW_ON_LENGTH - dispatch}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(
          cycle.deliveredKwh ? CHANNEL_WIDTH : tokens.stroke.hairline,
        )}
        opacity={cycle.deliveredKwh ? 1 : atomic.opacity["20"]}
        fill="none"
      />
      {input.showLossChannels ? (
        <g>
          {[
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
          ].map(({ key, path, progress, value }) => {
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
          })}
        </g>
      ) : undefined}
    </g>
  );
}
