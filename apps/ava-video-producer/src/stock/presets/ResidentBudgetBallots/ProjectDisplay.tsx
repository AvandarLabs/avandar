import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ProjectTally } from "./ProjectTally";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";
/** Inputs for ProjectDisplay. */
type Props = { input: Input; frame: number };

/** Choices and abstentions own distinct columns regardless of concentration. */
export function ProjectDisplay({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const offset =
    256 * (1 - motion.ramp(frame, 84, motion.scale(24), motion.exit.easing));
  const columnWidth = 864 / (input.projects.length + 1);
  return (
    <g>
      {input.projects.map((project, index) => {
        return (
          <ProjectTally
            key={project.id}
            input={input}
            project={project}
            index={index}
            columnWidth={columnWidth}
            offset={offset}
          />
        );
      })}
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
