import { SceneLabel } from "./SceneLabel";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Destination captions identify the three simultaneous accounting regions. */
export function SessionHeadings({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.sceneLabel} x={32} y={35} width={700} />
      <SceneLabel
        text={input.copy.opening}
        x={32}
        y={100}
        width={210}
        lines={4}
      />
      <SceneLabel text={input.copy.administered} x={290} y={100} width={350} />
      <SceneLabel
        text={input.copy.remaining}
        x={700}
        y={120}
        width={225}
        lines={4}
      />
      <SceneLabel
        text={input.copy.discarded}
        x={700}
        y={325}
        width={225}
        lines={4}
      />
    </g>
  );
}
