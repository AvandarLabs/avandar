import { ramp } from "../../../motion";
import { RetainedRecord } from "./RetainedRecord";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string; frame: number };
/** Stable rows retain IDs and exact category ownership under the stencil. */
export function RetainedRecordStrip({
  input,
  accent,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.records.map((record, index) => (
        <RetainedRecord key={record.id} {...{ record, index, input, accent }} />
      ))}
      {input.installation.choice === "install" ? (
        <rect
          data-counting-stencil=""
          x={244}
          y={148}
          width={225}
          height={input.records.length * 48 + 7}
          rx={8}
          fill="none"
          stroke={accent}
          strokeDasharray="5 5"
          opacity={ramp(frame, 56, 34)}
        />
      ) : null}
    </g>
  );
}
