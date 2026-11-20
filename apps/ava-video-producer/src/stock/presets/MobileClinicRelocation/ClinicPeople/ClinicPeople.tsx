import { FitText } from "../../../primitives/FitText/FitText";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BookingConnector } from "./BookingConnector";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Distinct connector lanes pass below labels and beside the appointment tabs.
 */
function _buildBookingPath({
  x,
  personIndex,
  slotIndex,
}: {
  x: number;
  personIndex: number;
  slotIndex: number;
}): string {
  const laneX = 617 + slotIndex * 2;
  const laneY =
    personIndex < 5 ? 384 + personIndex * 3 : 398 + (personIndex - 5) * 2;
  return `M${x + 12} 418 V${laneY} H${laneX} V${160 + slotIndex * 44} H642`;
}
/** Each person remains present whether booked or explicitly unbooked. */
export function ClinicPeople({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      {input.people.map((person, index) => {
        const x = 62 + index * 114;
        const y = 418;
        const slotIndex = input.slots.findIndex(({ id }) => {
          return id === person.slotId;
        });
        return (
          <g
            key={person.id}
            data-person-id={person.id}
            data-slot-reference={person.slotId ?? undefined}
            data-unbooked={person.slotId === null}
            opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
          >
            {person.slotId !== null ? (
              <BookingConnector
                slotId={person.slotId}
                path={_buildBookingPath({ x, personIndex: index, slotIndex })}
                frame={frame}
                index={index}
                accent={accent}
              />
            ) : undefined}
            <PersonGlyph
              x={x}
              y={y}
              size={25}
              color={person.slotId === null ? tokens.color.highlight : accent}
            />
            <FitText
              text={person.label}
              x={x - 20}
              y={y + 27}
              width={110}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}
