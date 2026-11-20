import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ProjectSymbol } from "./ProjectSymbol";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  project: Input["projects"][number] | null;
  index: number;
  columnWidth: number;
  offset: number;
};
/** A project or abstention count describes preferences without a winner. */
export function ProjectTally({
  input,
  project,
  index,
  columnWidth,
  offset,
}: Readonly<Props>): ReactNode {
  const total = input.ballots.filter(
    propEq("projectId", project?.id ?? null),
  ).length;
  const x = 48 + index * columnWidth;
  return (
    <g
      data-tally={project?.id}
      data-total={project ? total : undefined}
      data-abstentions={project ? undefined : total}
    >
      {project ? (
        <ProjectSymbol symbol={project.symbol} x={x + 30} y={191 + offset} />
      ) : undefined}
      <LabelSlots
        labels={[
          [
            project?.label ?? input.labels.abstained,
            x,
            224 + offset,
            columnWidth - 16,
            14,
            4,
          ],
        ]}
      />
      {input.showTotals ? (
        <TallyTotal
          total={total}
          x={x + (project ? 100 : 30)}
          y={200 + offset}
          isAbstention={!project}
        />
      ) : undefined}
    </g>
  );
}

/** A tally's total, in the highlight for abstentions. */
function TallyTotal({
  total,
  x,
  y,
  isAbstention,
}: Readonly<{
  total: number;
  x: number;
  y: number;
  isAbstention: boolean;
}>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <text
      x={x}
      y={y}
      fill={isAbstention ? tokens.color.highlight : tokens.color.text}
      fontSize={tokens.text.graphic.body.fontSize}
      fontFamily={tokens.text.graphic.body.fontFamily}
      fontWeight={tokens.text.graphic.body.fontWeight}
    >
      {total}
    </text>
  );
}
