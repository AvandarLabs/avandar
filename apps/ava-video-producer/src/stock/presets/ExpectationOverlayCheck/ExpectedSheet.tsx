import { EASE, mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  y: number;
  input: Input;
  item: Input["tests"][number];
  state: string;
  accent: string;
};
function _getSheetGeometry({
  frame,
  y,
  input,
  state,
}: Readonly<Pick<Props, "frame" | "y" | "input" | "state">>) {
  const registration = ramp(frame, 43, 45, EASE.inOut);
  const separation = ramp(frame, 89, 19, EASE.inOut);
  const top =
    (input.sheetMotion === "hinge"
      ? y + 20
      : mix(registration, y - 45, y + 20)) -
    (state === "match" ? 0 : 39) * separation;
  const scale =
    input.sheetMotion === "hinge"
      ? Math.cos(((1 - registration) * 80 * Math.PI) / 180)
      : 1;
  return { registration, top, scale };
}
/** The upper edge stays fixed during a hinge, then the sheets register. */
export function ExpectedSheet({
  frame,
  y,
  input,
  item,
  state,
  accent,
}: Readonly<Props>): ReactNode {
  const { registration, top, scale } = _getSheetGeometry({
    frame,
    y,
    input,
    state,
  });
  return (
    <g>
      <g data-expected-sheet={item.id} transform={`translate(510 ${top})`}>
        <g
          data-hinge={input.sheetMotion === "hinge"}
          transform={`matrix(1 0 0 ${scale} 0 0)`}
        >
          <rect
            width={390}
            height={39}
            rx={2}
            fill={accent}
            fillOpacity={0.06}
            stroke={accent}
            strokeWidth={2}
          />
        </g>
        <g opacity={input.sheetMotion === "hinge" ? registration : 1}>
          <LiteralDataText value={item.expected} x={15} y={24} color={accent} />
        </g>
      </g>
      <path
        d={`M490 ${y - 20} H500 V${top + 6} H510 M490 ${y + 65} H500 V${y + 50} H510`}
        stroke={STOCK.line}
        fill="none"
      />
    </g>
  );
}
