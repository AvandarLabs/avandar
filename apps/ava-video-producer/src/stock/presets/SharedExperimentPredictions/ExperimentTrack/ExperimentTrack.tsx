import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { TrackLabels } from "../TrackLabels";
import { ExperimentTrackPanel } from "./ExperimentTrackPanel";
import { useExperimentTrackPresentation } from "./useExperimentTrackPresentation";
import type { Input } from "../SharedExperimentPredictions.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * A single released ball stops at the supplied observation after all flags
 * land.
 */
export function ExperimentTrack(props: Readonly<Props>): ReactNode {
  const presentation = useExperimentTrackPresentation(props);

  return (
    <g>
      <ExperimentTrackPanel {...presentation} />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M400 480 L450 500 H880 M450 495 V507 M880 495 V507",
        }}
        profile={presentation.tokens.sketch.shape}
        fill="none"
        stroke={presentation.tokens.color.inactive}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.default,
        )}
      />
      <circle
        data-ball-distance={presentation.roll * props.input.observationDistance}
        cx={presentation.ballX}
        cy={Motion.mix({ t: presentation.descent, from: 470, to: 490 })}
        r={7}
        fill={presentation.tokens.color.highlight}
      />
      {props.frame >= 108 ? (
        <g data-observation-distance={props.input.observationDistance}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${presentation.observedX} 472 l6 6 l-6 6 l-6 -6 Z`,
            }}
            profile={presentation.tokens.sketch.shape}
            fill={props.accent}
            stroke={props.accent}
          />
        </g>
      ) : undefined}
      <TrackLabels input={props.input} />{" "}
    </g>
  );
}
