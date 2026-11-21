import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClassroomAttendanceTotal } from "./ClassroomAttendanceTotal/ClassroomAttendanceTotal";
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
          <ClassroomAttendanceTotal
            key={key}
            itemKey={key}
            {...{ index, tokens, label, value, input }}
          />
        );
      })}
    </g>
  );
}
