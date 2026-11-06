import { ramp, EASE } from "../../../motion";
import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { AquiferOwnershipKey } from "./AquiferOwnershipKey";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AquiferCutaway. */
type Props = { frame: number; accent: string; input: Input };

/** Recharge, pumping and natural outflow cross separate physical boundaries. */
export function AquiferCutaway({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const recharge = ramp(frame, 36, 30, EASE.inOut),
    withdraw = ramp(frame, 72, 36, EASE.inOut);
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
      color: STOCK.cyan,
    },
    {
      key: "natural",
      number: 3,
      x: 868,
      y: 330,
      path: "M 700 330 H 850",
      progress: withdraw,
      value: flows.naturalOutflowM3,
      color: STOCK.orange,
    },
  ];
  return (
    <g>
      <path
        d="M 280 222 Q 380 202 480 222 T 720 222 V 397 H 280 Z"
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <rect
        data-aquifer-fill="true"
        x={300}
        y={380 - height}
        width={400}
        height={height}
        fill={accent}
        fillOpacity={0.5}
      />
      <path
        d="M 300 230 V 380 H 700 V 230"
        stroke={STOCK.muted}
        strokeWidth={2}
        fill="none"
      />
      {paths.map(({ key, number, x, y, path, progress, value, color }) => (
        <g key={key}>
          <path
            data-flow-guide={key}
            d={path}
            stroke={STOCK.muted}
            strokeWidth={1}
            strokeDasharray="3 4"
            fill="none"
          />
          <path
            data-flow={key}
            data-quantity={value}
            d={path}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
            opacity={value ? 1 : 0}
            stroke={color}
            strokeWidth={7}
            fill="none"
          />
          <g data-flow-ownership={key}>
            <AquiferOwnershipKey number={number} x={x} y={y} />
          </g>
        </g>
      ))}
      <rect
        x={32}
        y={320}
        width={210}
        height={78}
        rx={8}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="5 5"
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
          <rect
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
            stroke={STOCK.orange}
          />
          <g data-flow-ownership="unallocated">
            <AquiferOwnershipKey number={4} x={18} y={405.5} />
          </g>
        </>
      ) : undefined}
    </g>
  );
}
