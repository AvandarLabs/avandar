import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { RefreshRecord } from "./RefreshRecord";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** One source refresh preserves identities and every human-owned field. */
export function StatePreservingSourceRefresh({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const writes = input.records.filter(
    (record) =>
      input.sourceRows.find(({ id }) => id === record.id)?.label !==
      record.label,
  ).length;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 50, 580, 850, 14, 1],
          [
            frame >= 140 ? input.copy.after : input.copy.before,
            50,
            30,
            850,
            14,
            1,
          ],
          [input.labels.derived, 220, 58, 350, 14, 3],
          [input.labels.human, 610, 58, 290, 14, 3],
        ]}
      />
      {input.records.map((record, index) => (
        <RefreshRecord
          key={record.id}
          input={input}
          record={record}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      {input.showWriteCount ? (
        <g data-write-count={frame >= 139 ? writes : 0}>
          <path
            d="M720 559 l12 -12 l5 5 l-12 12 l-7 2 Z"
            fill="none"
            stroke={STOCK.cyan}
            strokeWidth={2}
          />
          <LabelSlots
            labels={[[String(frame >= 139 ? writes : 0), 755, 566, 145, 16, 1]]}
          />
        </g>
      ) : null}
    </g>
  );
}
