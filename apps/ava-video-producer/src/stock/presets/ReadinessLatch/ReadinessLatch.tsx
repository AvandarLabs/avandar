import { prop } from "@avandar/utils";
import { ReadinessCaptions } from "./ReadinessCaptions";
import { ReadinessGate } from "./ReadinessGate";
import { ReadinessResult } from "./ReadinessResult";
import { ReadinessRibbon } from "./ReadinessRibbon";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Every authored branch must finish and withdraw its pin before release. */
export function ReadinessLatch({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const horizontal = input.orientation === "horizontal";
  const allReady = input.participants.every(prop("ready"));
  const maxWork = Math.max(...input.participants.map(prop("workUnits")));
  const ribbonProps = {
    numParticipants: input.participants.length,
    maxWork,
    frame,
    input,
    accent,
  };
  return (
    <g>
      {input.participants.map((participant, index) => (
        <ReadinessRibbon
          key={participant.id}
          participant={participant}
          index={index}
          {...ribbonProps}
        />
      ))}
      <ReadinessGate
        horizontal={horizontal}
        allReady={allReady}
        frame={frame}
      />
      <ReadinessResult
        horizontal={horizontal}
        allReady={allReady}
        frame={frame}
        accent={accent}
        input={input}
      />
      {input.showLabels ? (
        <ReadinessCaptions input={input} frame={frame} allReady={allReady} />
      ) : undefined}
    </g>
  );
}
