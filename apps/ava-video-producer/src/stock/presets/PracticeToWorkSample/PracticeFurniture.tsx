import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { MeasuredArtifact } from "./MeasuredArtifact";
import { WorkshopBench } from "./WorkshopBench";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Furniture changes around the retained learner and measured practice sheet.
 */
export function PracticeFurniture({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const transfer = ramp(frame, 56, 22, EASE.inOut);
  const practiceX = mix(transfer, 370, 100);
  const practiceY = mix(transfer, 270, 320);
  return (
    <g>
      <g
        data-practice-desk="true"
        transform={`translate(${practiceX - 20} ${practiceY + 118})`}
      >
        <path
          d="M0 0 H260 M20 0 V55 M240 0 V55"
          stroke={STOCK.line}
          strokeWidth={6}
        />
      </g>
      <WorkshopBench transfer={transfer} />
      {input.showFirstArtifactAtHold || frame < 112 ? (
        <MeasuredArtifact
          input={input}
          x={practiceX}
          y={practiceY}
          progress={ramp(frame, 32, 18, EASE.inOut)}
          isPractice
          accent={accent}
        />
      ) : undefined}
      <g opacity={transfer}>
        <MeasuredArtifact
          input={input}
          x={590}
          y={270}
          progress={ramp(frame, 90, 18, EASE.inOut)}
          isPractice={false}
          accent={accent}
        />
      </g>
    </g>
  );
}
