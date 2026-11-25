import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { JigGuide } from "./JigGuide/JigGuide";
import { JigMakerLabel } from "./JigMakerLabel";
import { JigMakingTool } from "./JigMakingTool";
import { JigMarkingHand } from "./JigMarkingHand";
import { SharedJigStation } from "./SharedJigStation";
import { useSharedJigPreparationPresentation } from "./useSharedJigPreparationPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";
/** Inputs for SharedJigPreparation. */
type Props = GraphicProps & { input: Input };
/** One prepared guide is physically shared in collection order and retained. */
export function SharedJigPreparation(props: Readonly<Props>): ReactNode {
  const presentation = useSharedJigPreparationPresentation(props);

  return (
    <g>
      <LabelSlots
        labels={[
          [presentation.action, 48, 66, 864, 24, 2],
          [props.input.labels.example, 48, 24, 864, 14, 1],
        ]}
      />
      {props.input.collaborators.map((collaborator, index) => {
        return (
          <SharedJigStation
            key={collaborator.id}
            {...presentation}
            collaborator={collaborator}
            index={index}
          />
        );
      })}
      <PersonGlyph
        x={presentation.scene.guideX}
        y={440}
        size={32}
        role="worker"
        color={presentation.tokens.color.highlight}
      />
      <JigMakerLabel {...presentation} />
      <JigGuide input={props.input} scene={presentation.scene} />
      <JigMarkingHand input={props.input} scene={presentation.scene} />
      {props.frame < 49 ? (
        <JigMakingTool
          frame={props.frame}
          pattern={props.input.guide.pattern}
          accent={props.accent}
        />
      ) : undefined}
    </g>
  );
}
