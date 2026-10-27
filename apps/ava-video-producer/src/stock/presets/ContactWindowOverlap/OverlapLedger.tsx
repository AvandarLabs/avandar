import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
function _getCounts(input: Input) {
  const unknown = input.records.filter(propEq("start", null)).length;
  const overlapping = input.records.filter(
    (record) =>
      record.start !== null &&
      record.end !== null &&
      Math.max(record.start, input.investigationWindow.start) <
        Math.min(record.end, input.investigationWindow.end),
  ).length;
  return [overlapping, input.records.length - unknown - overlapping, unknown];
}
/**
 * Review candidates, nonintersections and unknown people partition the input.
 */
export function OverlapLedger({ input, frame }: Readonly<Props>): ReactNode {
  const counts = _getCounts(input);
  return (
    <g opacity={ramp(frame, 116, 10)}>
      {[input.copy.overlap, input.copy.none, input.copy.unknown].map(
        (label, index) => (
          <g key={index}>
            <SceneLabel
              text={label}
              x={32 + index * 305}
              y={520}
              width={280}
              lines={3}
            />
            {input.showOverlapFractions ? (
              <text
                data-overlap-count={index}
                x={32 + index * 305}
                y={490}
                fill={STOCK.text}
                fontSize={20}
              >
                {counts[index]}/{input.records.length}
              </text>
            ) : undefined}
          </g>
        ),
      )}
    </g>
  );
}
