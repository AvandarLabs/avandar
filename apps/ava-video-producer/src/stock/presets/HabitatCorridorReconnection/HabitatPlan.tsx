import { ramp, EASE } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { getRoutePointFromProgress } from "../../primitives/RoutePath/getRoutePointFromProgress";
import { STOCK } from "../../stockPalette";
import { makeCorridorRouteFromInputAndFrame } from "./makeCorridorRouteFromInputAndFrame";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for HabitatPlan. */
type Props = {
  frame: number;
  accent: string;
  background?: string;
  input: Input;
};

/**
 * The complete outline or solid route crosses the road before optional
 * illustrative travel.
 */
export function HabitatPlan({
  frame,
  accent,
  background = STOCK.ground,
  input,
}: Readonly<Props>): ReactNode {
  const { points, path } = makeCorridorRouteFromInputAndFrame({ input, frame });
  const laid = ramp(frame, 36, 22, EASE.inOut),
    crossing = ramp(frame, 58, 20, EASE.inOut);
  const marker = getRoutePointFromProgress({
    points: points.map((point) => ({ x: point.x / 960, y: point.y / 960 })),
    progress: ramp(frame, 82, 26, EASE.inOut),
  });
  return (
    <g>
      <rect x={462} y={225} width={36} height={145} fill={STOCK.line} />
      <path
        d="M 480 225 V 370"
        stroke={STOCK.muted}
        strokeDasharray="7 5"
        fill="none"
      />
      {input.patches.map((patch, index) => (
        <g key={patch.id}>
          <ellipse
            data-habitat-patch={patch.id}
            cx={155 + index * 650}
            cy={300}
            rx={100}
            ry={62}
            fill={accent}
            fillOpacity={0.22}
            stroke={accent}
          />
          <FitText
            text={patch.label}
            x={32 + index * 684}
            y={200}
            width={212}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <FitText
            text={String(patch.areaHa)}
            x={72 + index * 650}
            y={382}
            width={180}
            fontSize={12}
            maxLines={2}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ))}
      <path
        d={path}
        stroke={background}
        strokeWidth={36}
        strokeLinejoin="round"
        fill="none"
        opacity={crossing}
      />
      <g opacity={laid}>
        <path
          data-corridor-route="true"
          d={path}
          stroke={accent}
          strokeWidth={26}
          strokeLinejoin="round"
          fill="none"
        />
        {input.decision.stage === "proposal" ? (
          <path
            data-proposal-interior="true"
            d={path}
            stroke={background}
            strokeWidth={22}
            strokeLinejoin="round"
            fill="none"
          />
        ) : undefined}
        <path
          d={`M 440 ${300 - 50 * crossing + 18} V 325 M 520 ${300 - 50 * crossing + 18} V 325`}
          stroke={STOCK.muted}
          strokeWidth={2}
          fill="none"
        />
      </g>
      {input.showIllustrativeTraversal && frame >= 82 ? (
        <circle
          data-illustrative-traversal="true"
          cx={marker.x * 960}
          cy={marker.y * 960}
          r={6}
          fill={STOCK.orange}
          stroke={background}
          strokeWidth={2}
        />
      ) : undefined}
    </g>
  );
}
