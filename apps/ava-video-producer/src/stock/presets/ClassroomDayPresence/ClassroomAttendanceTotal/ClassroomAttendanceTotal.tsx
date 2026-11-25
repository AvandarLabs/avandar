import { FitText } from "../../../primitives/FitText/FitText";
import { ClassroomAttendanceSymbol } from "../ClassroomAttendanceSymbol/ClassroomAttendanceSymbol";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";

type Props = {
  itemKey: Array<
    | { key: string; label: Input["labels"]["present"]; value: number }
    | { key: string; label: Input["labels"]["absent"]; value: number }
    | { key: string; label: Input["labels"]["unknown"]; value: number }
    | { key: string; label: Input["labels"]["roster"]; value: number }
  >[number]["key"];
  index: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  label: Array<
    | { key: string; label: Input["labels"]["present"]; value: number }
    | { key: string; label: Input["labels"]["absent"]; value: number }
    | { key: string; label: Input["labels"]["unknown"]; value: number }
    | { key: string; label: Input["labels"]["roster"]; value: number }
  >[number]["label"];
  value: Array<
    | { key: string; label: Input["labels"]["present"]; value: number }
    | { key: string; label: Input["labels"]["absent"]; value: number }
    | { key: string; label: Input["labels"]["unknown"]; value: number }
    | { key: string; label: Input["labels"]["roster"]; value: number }
  >[number]["value"];
  input: Input;
};

/** Renders the label label with authored geometry. */
export function ClassroomAttendanceTotal({
  itemKey: key,
  index,
  tokens,
  label,
  value,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g key={key}>
      <ClassroomAttendanceSymbol itemKey={key} index={index} tokens={tokens} />
      <FitText
        text={label}
        x={54 + index * 232}
        y={542}
        width={194}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={
          key === "present"
            ? `${value} / ${input.learners.length}`
            : String(value)
        }
        x={54 + index * 232}
        y={592}
        width={194}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
