import { mix } from "../../../motion";
import { Text } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { ClassroomImpressions } from "./ClassroomImpressions";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Data for Desk. */
type DeskResult = {
  x: number;
  y: number;
  state: Input["days"][number]["records"][number]["state"];
  previousState: Input["days"][number]["records"][number]["state"];
};

type Desk = Input["learners"][number] & DeskResult;
type Props = {
  desk: Desk;
  transition: number;
  accent: string;
  input: Input;
  activeIndex: number;
};
/**
 * One silhouette per learner occupies only that learner's persistent named
 * desk.
 */
export function ClassroomDesk({
  desk,
  transition,
  accent,
  input,
  activeIndex,
}: Readonly<Props>): ReactNode {
  const occupied = mix(
    transition,
    Number(desk.previousState === "present"),
    Number(desk.state === "present"),
  );
  const unknown = mix(
    transition,
    Number(desk.previousState === "unknown"),
    Number(desk.state === "unknown"),
  );
  return (
    <g
      data-desk={desk.id}
      data-state={desk.state}
      data-x={desk.x}
      data-y={desk.y}
    >
      <rect
        x={desk.x - 12}
        y={desk.y - 6}
        width={28}
        height={38}
        rx={7}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray={desk.state === "unknown" ? "3 3" : undefined}
      />
      <g data-learner-silhouette={desk.id} opacity={occupied}>
        <PersonGlyph
          x={desk.x}
          y={desk.y + 12 * (1 - occupied)}
          size={38}
          posture="seated"
          color={accent}
        />
      </g>
      {unknown > 0 ? (
        <g data-unknown-marker={desk.id} opacity={unknown}>
          <Text
            x={desk.x}
            y={desk.y - 8}
            size={20}
            anchor="middle"
            fill={STOCK.orange}
          >
            ?
          </Text>
        </g>
      ) : undefined}
      <rect
        data-desk-top={desk.id}
        x={desk.x - 46}
        y={desk.y + 24}
        width={92}
        height={16}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      <path
        d={`M ${desk.x - 38} ${desk.y + 40} v 10 M ${desk.x + 38} ${desk.y + 40} v 10`}
        stroke={STOCK.muted}
        fill="none"
      />
      <FitText
        text={desk.label}
        x={desk.x - 65}
        y={desk.y + 67}
        width={130}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <ClassroomImpressions
        input={input}
        learnerId={desk.id}
        x={desk.x}
        y={desk.y + 109}
        activeIndex={activeIndex}
      />
    </g>
  );
}
