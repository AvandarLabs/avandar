import { ramp, EASE } from "../../../motion";
import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for BatteryVessel. */
type Props = { frame: number; accent: string; input: Input };

/**
 * Charge and dispatch paths have distinct boundaries and separately timed
 * losses.
 */
export function BatteryVessel({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const charge = ramp(frame, 36, 30, EASE.inOut),
    dispatch = ramp(frame, 80, 28, EASE.inOut);
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
      <rect x={x + 58} y={y - 8} width={48} height={8} fill={STOCK.line} />
      <rect
        x={x}
        y={y}
        width={164}
        height={170}
        rx={12}
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeWidth={2}
      />
      <rect
        data-battery-fill="true"
        x={x + 10}
        y={y + 160 - fillHeight}
        width={144}
        height={fillHeight}
        fill={accent}
        fillOpacity={0.65}
      />
      <path
        data-charge-path="true"
        d={paths.charge}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - charge}
        stroke={accent}
        strokeWidth={cycle.chargeInputKwh ? 8 : 1}
        opacity={cycle.chargeInputKwh ? 1 : 0.2}
        fill="none"
      />
      <path
        data-delivery-path="true"
        d={paths.delivery}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - dispatch}
        stroke={STOCK.cyan}
        strokeWidth={cycle.deliveredKwh ? 8 : 1}
        opacity={cycle.deliveredKwh ? 1 : 0.2}
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
          ].map(({ key, path, progress, value }) => (
            <path
              key={key}
              data-loss-channel={key}
              d={path}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
              stroke={STOCK.orange}
              strokeWidth={5}
              opacity={value ? 1 : 0}
              fill="none"
            />
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
