import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeRegisteredLandmarksFromInputAndFrame } from "./makeRegisteredLandmarksFromInputAndFrame";
import { RegistrationLedgerCoordinatePair } from "./RegistrationLedgerCoordinatePair/RegistrationLedgerCoordinatePair";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const points = makeRegisteredLandmarksFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {points.map((point) => {
        return (
          <g key={point.id}>
            <Text role="data" x={40 + point.index * 220} y={445}>
              {point.index + 1}·
            </Text>
            <LabelSlots
              labels={[
                [point.label, 66 + point.index * 220, 445, 190, 12, 3],
                [point.id, 40 + point.index * 220, 493, 210, 12, 1],
              ]}
            />
            <RegistrationLedgerCoordinatePair input={input} point={point} />
          </g>
        );
      })}
    </g>
  );
}
