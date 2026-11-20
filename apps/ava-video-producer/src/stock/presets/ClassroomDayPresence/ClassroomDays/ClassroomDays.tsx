import { Text } from "../../../graphics-common/Text";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClassroomDay } from "./ClassroomDay";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomDays. */
type Props = { input: Input; activeIndex: number };
/** Numbered authored days provide the visible key for every desk impression. */
export function ClassroomDays({
  input,
  activeIndex,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.days.map((day, index) => {
        return (
          <ClassroomDay
            key={day.id}
            label={day.label}
            index={index}
            isActive={index === activeIndex}
          />
        );
      })}
      <FitText
        text={input.caption}
        x={32}
        y={124}
        width={896}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
