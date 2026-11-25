import { LabelSlots } from "../../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../../primitives/SketchedShape";
import { getRecognitionObjectLayout } from "./getRecognitionObjectLayout";
import { RecognitionArtifactGlyph } from "./RecognitionArtifactGlyph";
import { RecognitionObjectBody } from "./RecognitionObjectBody";
import type { useRecognitionObjectsPresentation } from "../useRecognitionObjectsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useRecognitionObjectsPresentation>,
  "input" | "frame" | "accent" | "tokens" | "scales" | "motion" | "lineWidth"
> & {
  item: ReturnType<
    typeof useRecognitionObjectsPresentation
  >["input"]["contributions"][number];
  index: number;
};
/** Render one recognition object. */
export function RecognitionObject(props: Readonly<Props>): ReactNode {
  const presentation = getRecognitionObjectLayout(props);

  return (
    <g
      key={props.item.id}
      data-contribution-id={props.item.id}
      opacity={props.motion.reveal(
        props.frame,
        16 + props.index * props.motion.stagger.list,
      )}
    >
      <g data-contribution-caption={props.item.id}>
        <LabelSlots
          labels={[[props.item.label, presentation.x - 10, 145, 180, 16, 4]]}
        />
      </g>
      <RecognitionObjectBody {...presentation} />
      <RecognitionArtifactGlyph {...presentation} />
      {props.input.showAuthorshipTab ? (
        <g data-authorship-tab={props.item.id}>
          <SketchedShape
            shape={{ kind: "path", d: `M${presentation.x + 4} 330 v14 h150` }}
            profile={props.tokens.sketch.shape}
            fill="none"
            stroke={props.accent}
          />
          <LabelSlots
            labels={[
              [props.input.people.contributor, presentation.x, 365, 180, 14, 3],
            ]}
          />
        </g>
      ) : presentation.focused ? (
        <g data-authorship-byline="true">
          <LabelSlots
            labels={[
              [props.input.people.contributor, presentation.x, 365, 180, 14, 3],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
