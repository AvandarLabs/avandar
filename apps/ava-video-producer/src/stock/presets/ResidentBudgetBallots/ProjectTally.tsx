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
  const tokens = useGraphicTokens();
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
        <text
          x={x + (project ? 100 : 30)}
          y={200 + offset}
          fill={project ? tokens.color.text : tokens.color.highlight}
          fontSize={tokens.text.graphic.body.fontSize}
          fontFamily={tokens.text.graphic.body.fontFamily}
        >
          {total}
        </text>
      ) : undefined}
    </g>
  );
}
