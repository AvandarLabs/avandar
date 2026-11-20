import { propEq } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomTotals. */
type Props = { input: Input; day: Input["days"][number] };
/** Separate state totals share the unchanged supplied-roster denominator. */
export function ClassroomTotals({ input, day }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const present = day.records.filter(propEq("state", "present")).length,
    absent = day.records.filter(propEq("state", "absent")).length,
    unknown = day.records.filter(propEq("state", "unknown")).length;
  const totals = [
    { key: "present", label: input.labels.present, value: present },
    { key: "absent", label: input.labels.absent, value: absent },
    { key: "unknown", label: input.labels.unknown, value: unknown },
    { key: "roster", label: input.labels.roster, value: input.learners.length },
  ];
  return (
    <g
      data-attendance-totals="true"
      data-present={present}
      data-absent={absent}
      data-unknown={unknown}
      data-roster={input.learners.length}
    >
      {totals.map(({ key, label, value }, index) => {
        return (
          <g key={key}>
            {key === "present" ? (
              <circle
                cx={39 + index * 232}
                cy={538}
                r={5}
                fill={tokens.color.positive}
              />
            ) : key === "absent" ? (
              <StockRect
                x={34 + index * 232}
                y={533}
                width={10}
                height={10}
                stroke={tokens.color.inactive}
                fill="none"
              />
            ) : key === "unknown" ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M ${39 + index * 232} 532 l 6 6 l -6 6 l -6 -6 Z`,
                }}
                profile={tokens.sketch.shape}
                stroke={tokens.color.highlight}
                fill="none"
              />
            ) : undefined}
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
      })}
    </g>
  );
}
