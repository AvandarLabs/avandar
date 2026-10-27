import { ClassroomDays } from "./ClassroomDays";
import { ClassroomDesk } from "./ClassroomDesk";
import { ClassroomTotals } from "./ClassroomTotals";
import { makeClassroomStateFromInputAndFrame } from "./makeClassroomStateFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomDayPresence. */
type Props = GraphicProps & { input: Input };

/** Persistent desks keep present, absent and unknown daily records distinct. */
export function ClassroomDayPresence({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { activeIndex, transition, desks, day } =
    makeClassroomStateFromInputAndFrame({
      frame,
      input,
    });
  return (
    <g>
      <ClassroomDays input={input} activeIndex={activeIndex} />
      {desks.map((desk) => (
        <ClassroomDesk
          key={desk.id}
          desk={desk}
          transition={transition}
          accent={accent}
          input={input}
          activeIndex={activeIndex}
        />
      ))}
      <ClassroomTotals input={input} day={day} />
    </g>
  );
}
