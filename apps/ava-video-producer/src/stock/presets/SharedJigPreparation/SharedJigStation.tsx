import { JigStation } from "./JigStation/JigStation";
import type { useSharedJigPreparationPresentation } from "./useSharedJigPreparationPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSharedJigPreparationPresentation>,
  "scene" | "input" | "accent"
> & {
  collaborator: ReturnType<
    typeof useSharedJigPreparationPresentation
  >["input"]["collaborators"][number];
  index: number;
};
/** Render one shared jig station. */
export function SharedJigStation(props: Readonly<Props>): ReactNode {
  return (
    <JigStation
      key={props.collaborator.id}
      collaborator={props.collaborator}
      x={props.scene.centers[props.index]}
      hasApplication={props.scene.applications[props.index]}
      isAligned={
        props.scene.activeIndex === props.index &&
        props.scene.guideX === props.scene.centers[props.index] - 50
      }
      input={props.input}
      accent={props.accent}
    />
  );
}
