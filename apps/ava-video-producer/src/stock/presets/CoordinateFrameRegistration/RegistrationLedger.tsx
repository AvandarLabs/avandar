import { Text } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { makeRegisteredLandmarksFromInputAndFrame } from "./makeRegisteredLandmarksFromInputAndFrame";
import type { Input } from "./CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Indexed identity rows associate complete labels with both coordinate pairs.
 */
export function RegistrationLedger({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const points = makeRegisteredLandmarksFromInputAndFrame({ input, frame });
  return (
    <g>
      {points.map((point) => (
        <g key={point.id}>
          <Text x={40 + point.index * 220} y={445} size={12}>
            {point.index + 1}·
          </Text>
          <LabelSlots
            labels={[
              [point.label, 66 + point.index * 220, 445, 190, 12, 3],
              [point.id, 40 + point.index * 220, 493, 210, 12, 1],
            ]}
          />
          {input.showCoordinatePairs ? (
            <g data-coordinate-pair={point.id}>
              <FitText
                text={`○ (${point.x}, ${point.y})`}
                x={40 + point.index * 220}
                y={516}
                width={210}
                fontSize={12}
                maxLines={3}
                breakLongWords
                normalizeWhitespace
              />
              <FitText
                text={`◇ (${point.targetX}, ${point.targetY})`}
                x={40 + point.index * 220}
                y={562}
                width={210}
                fontSize={12}
                maxLines={3}
                breakLongWords
                normalizeWhitespace
              />
            </g>
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
