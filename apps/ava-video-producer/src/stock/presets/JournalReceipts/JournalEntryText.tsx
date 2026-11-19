import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { LABELS_CUE } from "./journalTiming";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = { entry: Input["entries"][number]; input: Input; frame: number };

function _createLabelsFromEntry({
  entry,
  input,
  color,
}: {
  entry: Readonly<Input["entries"][number]>;
  input: Readonly<Input>;
  color: Readonly<{ text: string; textMuted: string }>;
}) {
  const horizontal = input.foldDirection === "horizontal";
  return [
    {
      text: entry.label,
      x: 10,
      y: horizontal ? 26 : 20,
      width: horizontal ? 134 : 222,
      fontSize: 14 as const,
      maxLines: horizontal ? 4 : 3,
      color: color.text,
    },
    ...(input.showIdentifiers
      ? [
          {
            text: entry.id,
            x: horizontal ? 10 : 240,
            y: horizontal ? 116 : 20,
            width: horizontal ? 130 : 68,
            fontSize: 12 as const,
            maxLines: horizontal ? 2 : 3,
            color: color.textMuted,
          },
        ]
      : []),
  ];
}

/** Entry labels and optional identities occupy separate fixed-size slots. */
export function JournalEntryText({
  entry,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const horizontal = input.foldDirection === "horizontal";
  if (!input.showLabels || frame < LABELS_CUE) {
    return (
      <SketchedShape
        shape={{
          kind: "path",
          d: horizontal ? "M12 36 h96 M12 48 h70" : "M12 25 h220 M12 36 h160",
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    );
  }
  const labels = _createLabelsFromEntry({
    entry,
    input,
    color: tokens.color,
  });
  return (
    <g>
      {labels.map((label) => {
        return (
          <FitText
            key={label.x + label.y}
            {...label}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </g>
  );
}
