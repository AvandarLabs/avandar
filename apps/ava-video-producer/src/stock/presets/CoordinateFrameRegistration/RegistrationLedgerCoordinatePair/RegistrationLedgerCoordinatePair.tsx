import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CoordinateFrameRegistration.schema";
import type { makeRegisteredLandmarksFromInputAndFrame } from "../makeRegisteredLandmarksFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  point: ReturnType<typeof makeRegisteredLandmarksFromInputAndFrame>[number];
};

/** Renders the coordinate pair with authored geometry. */
export function RegistrationLedgerCoordinatePair({
  input,
  point,
}: Readonly<Props>): ReactNode {
  return (
    <>
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
    </>
  );
}
