import { STOCK, type GraphicProps } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import { JigGuide } from "./JigGuide";
import { JigMakingTool } from "./JigMakingTool";
import { JigMarkingHand } from "./JigMarkingHand";
import { JigStation } from "./JigStation";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";
/** Inputs for SharedJigPreparation. */
type Props = GraphicProps & { input: Input };

/** One prepared guide is physically shared in collection order and retained. */
export function SharedJigPreparation({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = getJigSceneFromFrame({ frame, input });
  const action =
    frame < 49
      ? input.labels.prepare
      : frame < 131
        ? input.labels.apply
        : input.labels.retained;
  return (
    <g>
      <LabelSlots
        labels={[
          [action, 48, 66, 864, 24, 2],
          [input.labels.example, 48, 24, 864, 14, 1],
        ]}
      />
      {input.collaborators.map((collaborator, index) => (
        <JigStation
          key={collaborator.id}
          collaborator={collaborator}
          x={scene.centers[index]}
          hasApplication={scene.applications[index]}
          isAligned={
            scene.activeIndex === index &&
            scene.guideX === scene.centers[index] - 50
          }
          input={input}
          accent={accent}
        />
      ))}
      <PersonGlyph
        x={scene.guideX}
        y={440}
        size={32}
        role="worker"
        color={STOCK.orange}
      />
      <FitText
        text={input.makerLabel}
        x={Math.min(610, scene.guideX - 40)}
        y={550}
        width={300}
        fontSize={12}
        maxLines={2}
        color={STOCK.orange}
        normalizeWhitespace
        breakLongWords
      />
      <JigGuide input={input} scene={scene} />
      <JigMarkingHand input={input} scene={scene} />
      {frame < 49 ? (
        <JigMakingTool
          frame={frame}
          pattern={input.guide.pattern}
          accent={accent}
        />
      ) : undefined}
    </g>
  );
}
