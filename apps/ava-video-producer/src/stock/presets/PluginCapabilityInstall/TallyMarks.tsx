import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  records: Input["records"];
  y: number;
  frame: number;
  accent: string;
};
/** Each retained ID contributes one staggered mark to its single category. */
export function TallyMarks({
  input,
  records,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {records.map((record, index) => (
        <path
          key={record.id}
          data-tally-record={record.id}
          d={`M${768 + index * 16.875} ${y - 7} v14`}
          stroke={accent}
          strokeWidth={2}
          opacity={ramp(
            frame,
            91 + input.records.findIndex(propEq("id", record.id)) * 3,
            20,
          )}
        />
      ))}
    </g>
  );
}
