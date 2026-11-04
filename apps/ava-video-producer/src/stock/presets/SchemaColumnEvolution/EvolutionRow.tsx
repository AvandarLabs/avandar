import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { EvolutionAddedValue } from "./EvolutionAddedValue";
import { EvolutionRowBackdrop } from "./EvolutionRowBackdrop";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

type Props = {
  record: Input["earlierRecords"][number] & { addedValue?: string | null };
  x: number;
  y: number;
  accent: string;
  expansion: number;
  missingLabel: string;
  missingOpacity: number;
  isLater?: boolean;
};
/** Retained identity, original value and explicit absent collection value. */
export function EvolutionRow({
  record,
  x,
  y,
  accent,
  expansion,
  missingLabel,
  missingOpacity,
  isLater = false,
}: Readonly<Props>): ReactNode {
  const isMissing = !isLater || record.addedValue === null;
  return (
    <g
      data-earlier-record={isLater ? undefined : record.id}
      data-later-record={isLater ? record.id : undefined}
    >
      <EvolutionRowBackdrop
        id={record.id}
        {...{ x, y, accent, expansion, isLater }}
      />
      <LabelSlots
        labels={[
          [record.label, x + 14, y + 16, 294, 12, 2],
          [record.id, x + 14, y + 52, 280, 12, 1],
          [record.recordedValue, x + 310, y + 15, 195, 12, 3],
        ]}
      />
      <EvolutionAddedValue
        id={record.id}
        value={isMissing ? missingLabel : (record.addedValue ?? missingLabel)}
        {...{ x, y, isMissing }}
        opacity={missingOpacity}
      />
    </g>
  );
}
