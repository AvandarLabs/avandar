import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AquiferOwnershipKey } from "./AquiferOwnershipKey";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AquiferCutaway. */
type Props = { frame: number; accent: string; input: Input };
const DRAW_ON_LENGTH = 1;

/** Recharge, pumping and natural outflow cross separate physical boundaries. */
export function AquiferCutaway({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const recharge = motion.ramp(
      frame,
      36,
      motion.scale(30),
      motion.travel.easing,
    ),
    withdraw = motion.ramp(frame, 72, motion.scale(36), motion.travel.easing);
  const { aquifer, flows } = input;
  const peak = aquifer.initialM3 + flows.rechargeM3;
  const final = peak - flows.naturalOutflowM3 - flows.approvedWithdrawalM3;
  const storage = withdraw
    ? interpolateFiniteRange({ from: peak, to: final, progress: withdraw })
    : interpolateFiniteRange({
        from: aquifer.initialM3,
        to: peak,
        progress: recharge,
      });
  const height = 150 * (storage / aquifer.diagramCapacityM3);
  const paths = [
    {
      key: "recharge",
      number: 1,
      x: 92,
      y: 260,
      path: "M 110 260 H 300",
      progress: recharge,
      value: flows.rechargeM3,
      color: accent,
    },
    {
      key: "approved",
      number: 2,
      x: 868,
      y: 220,
      path: "M 620 310 V 220 H 850",
      progress: withdraw,
      value: flows.approvedWithdrawalM3,
      color: tokens.color.accentAlt,
    },
    {
      key: "natural",
      number: 3,
      x: 868,
      y: 330,
      path: "M 700 330 H 850",
      progress: withdraw,
      value: flows.naturalOutflowM3,
      color: tokens.color.highlight,
    },
  ];
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M 280 222 Q 380 202 480 222 T 720 222 V 397 H 280 Z",
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <rect
        data-aquifer-fill="true"
        x={300}
        y={380 - height}
        width={400}
        height={height}
        fill={accent}
        fillOpacity={tokens.alpha.guide}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M 300 230 V 380 H 700 V 230" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
      {paths.map(({ key, number, x, y, path, progress, value, color }) => {
        return (
          <g key={key}>
            <SketchedShape
              shape={{ kind: "path", d: path }}
              profile={tokens.sketch.shape}
              data-flow-guide={key}
              stroke={tokens.color.inactive}
              strokeWidth={scales.stroke(tokens.stroke.hairline)}
              strokeDasharray={atomic.dash.short.join(" ")}
              fill="none"
            />
            <SketchedShape
              shape={{ kind: "path", d: path }}
              profile={tokens.sketch.shape}
              data-flow={key}
              data-quantity={value}
              pathLength={DRAW_ON_LENGTH}
              strokeDasharray={DRAW_ON_LENGTH}
              strokeDashoffset={DRAW_ON_LENGTH - progress}
              opacity={value ? 1 : 0}
              stroke={color}
              strokeWidth={scales.stroke(7)}
              fill="none"
            />
            <g data-flow-ownership={key}>
              <AquiferOwnershipKey number={number} x={x} y={y} />
            </g>
          </g>
        );
      })}
      <StockRect
        x={32}
        y={320}
        width={210}
        height={78}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray={atomic.dash.wide.join(" ")}
      />
      <FitText
        text={input.copy.requested}
        x={44}
        y={338}
        width={186}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {input.showUnallocatedRequest ? (
        <>
          <StockRect
            data-unallocated="true"
            data-quantity={
              flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3
            }
            x={35}
            y={401}
            width={
              204 *
              (flows.requestedWithdrawalM3
                ? (flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3) /
                  flows.requestedWithdrawalM3
                : 0)
            }
            height={9}
            fill="none"
            stroke={tokens.color.highlight}
          />
          <g data-flow-ownership="unallocated">
            <AquiferOwnershipKey number={4} x={18} y={405.5} />
          </g>
        </>
      ) : undefined}
    </g>
  );
}
