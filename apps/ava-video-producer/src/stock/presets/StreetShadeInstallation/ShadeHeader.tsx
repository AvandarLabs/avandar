import { SceneLabel } from "./SceneLabel";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Context, author and declared installation stage occupy reserved top rails.
 */
export function ShadeHeader({ input }: Readonly<Props>): ReactNode {
  const labels = [
    { text: input.copy.map, x: 45, y: 28, width: 410 },
    { text: input.referenceCondition, x: 500, y: 28, width: 410 },
    { text: input.decision.actorLabel, x: 45, y: 69, width: 410 },
    { text: input.decision.actionLabel, x: 500, y: 69, width: 410 },
    { text: input.copy.existing, x: 45, y: 116, width: 220 },
    { text: input.copy.added, x: 300, y: 116, width: 250 },
    { text: input.copy[input.decision.stage], x: 650, y: 116, width: 260 },
  ];
  return (
    <g>
      {labels.map((label, index) => (
        <SceneLabel key={index} {...label} />
      ))}
    </g>
  );
}
