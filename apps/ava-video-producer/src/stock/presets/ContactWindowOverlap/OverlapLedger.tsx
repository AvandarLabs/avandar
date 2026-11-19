import { propEq } from "@avandar/utils";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
function _getCounts(input: Input) {
  const unknown = input.records.filter(propEq("start", null)).length;
  const overlapping = input.records.filter((record) => {
    return (
      record.start !== null &&
      record.end !== null &&
      Math.max(record.start, input.investigationWindow.start) <
        Math.min(record.end, input.investigationWindow.end)
    );
  }).length;
  return [overlapping, input.records.length - unknown - overlapping, unknown];
}
/**
 * Review candidates, nonintersections and unknown people partition the input.
 */
export function OverlapLedger({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const counts = _getCounts(input);
  return (
    <g opacity={motion.ramp(frame, 116, motion.scale(10))}>
      {[input.copy.overlap, input.copy.none, input.copy.unknown].map(
        (label, index) => {
          return (
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
                  fill={tokens.color.text}
                  fontFamily={tokens.text.graphic.body.fontFamily}
                  fontSize={tokens.text.graphic.body.fontSize}
                >
                  {counts[index]}/{input.records.length}
                </text>
              ) : undefined}
            </g>
          );
        },
      )}
    </g>
  );
}
