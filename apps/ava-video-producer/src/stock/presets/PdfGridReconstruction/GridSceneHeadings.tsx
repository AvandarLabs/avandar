import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { inferredLayoutMessage } from "./PdfGridReconstruction.controls";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Page, evidence and result captions keep their own readable rails. */
export function GridSceneHeadings({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <LabelSlots
        labels={[
          [input.copy.context, 52, 42, 856, 18, 2],
          [input.evidenceLabel, 52, 82, 856, 14, 2],
          [input.copy.source, 52, 146, 400, 14, 3],
          [input.copy.result, 508, 146, 400, 14, 3],
        ]}
      />
      {input.signal === "whitespace" ? (
        <LabelSlots
          labels={[[stockI18n._(inferredLayoutMessage), 52, 122, 856, 12, 1]]}
        />
      ) : undefined}
    </g>
  );
}
