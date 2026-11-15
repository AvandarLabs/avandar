import { ramp } from "../../../motion";
import { ProjectTally } from "./ProjectTally";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";
/** Inputs for ProjectDisplay. */
type Props = { input: Input; frame: number };

/** Choices and abstentions own distinct columns regardless of concentration. */
export function ProjectDisplay({ input, frame }: Readonly<Props>): ReactNode {
  const offset = 256 * (1 - ramp(frame, 84, 24));
  const columnWidth = 864 / (input.projects.length + 1);
  return (
    <g>
      {input.projects.map((project, index) => (
        <ProjectTally
          key={project.id}
          input={input}
          project={project}
          index={index}
          columnWidth={columnWidth}
          offset={offset}
        />
      ))}
      <ProjectTally
        input={input}
        project={null}
        index={input.projects.length}
        columnWidth={columnWidth}
        offset={offset}
      />
    </g>
  );
}
