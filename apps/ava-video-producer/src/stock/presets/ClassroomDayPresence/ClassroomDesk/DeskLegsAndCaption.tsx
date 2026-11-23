import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";

type ParentProps = {
  desk: Desk;
  transition: number;
  accent: string;
  input: Input;
  activeIndex: number;
};

type Desk = Input["learners"][number] & DeskResult;

/** Data for Desk. */
type DeskResult = {
  x: number;
  y: number;
  state: Input["days"][number]["records"][number]["state"];
  previousState: Input["days"][number]["records"][number]["state"];
};

type Props = {
  desk: Readonly<ParentProps>["desk"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the desk legs and caption in authored paint order. */
export function DeskLegsAndCaption(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M ${options.desk.x - 38} ${options.desk.y + 40} v 10 M ${options.desk.x + 38} ${options.desk.y + 40} v 10`,
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.inactive}
        fill="none"
      />
      <FitText
        text={options.desk.label}
        x={options.desk.x - 65}
        y={options.desk.y + 67}
        width={130}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
