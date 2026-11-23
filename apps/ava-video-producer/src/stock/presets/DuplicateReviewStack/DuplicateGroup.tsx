import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DuplicateCandidate } from "./DuplicateCandidate";
import { DuplicateGroupHeading } from "./DuplicateGroupHeading/DuplicateGroupHeading";
import { getDuplicateGroupLayoutFromGroupAndFrame } from "./getDuplicateGroupLayoutFromGroupAndFrame";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  groupIndex: number;
  accent: string;
};

/** An unresolved bracket stays open. Retained groups preserve every ID tab. */
export function DuplicateGroup({
  frame,
  input,
  group,
  groupIndex,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, isPair, progress, records } =
    getDuplicateGroupLayoutFromGroupAndFrame({
      frame,
      input,
      group,
      groupIndex,
      motion,
    });
  return (
    <g data-unresolved-group={group.retainedId === null ? group.id : undefined}>
      <DuplicateGroupHeading
        frame={frame}
        input={input}
        group={group}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
        accent={accent}
      />
      {records.map((record) => {
        return (
          <DuplicateCandidate
            key={record.id}
            frame={frame}
            input={input}
            group={group}
            groupIndex={groupIndex}
            record={record}
            index={group.records.indexOf(record)}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
