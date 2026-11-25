import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { ReleaseDispositionLabel } from "./ReleaseDispositionLabel";
import { RepairRegister } from "./RepairRegister/RepairRegister";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { useReleaseRepairObligationsPresentation } from "./useReleaseRepairObligationsPresentation";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  props: Readonly<ParentProps>;
  presentation: ReturnType<typeof useReleaseRepairObligationsPresentation>;
};

/** Renders the repair register and held bracket in authored paint order. */
export function RepairRegisterAndHeldBracket(
  options: Readonly<Props>,
): ReactNode {
  return (
    <>
      <RepairRegister
        input={options.props.input}
        frame={options.props.frame}
        accent={options.props.accent}
        artifactX={options.presentation.artifactX}
      />
      {options.presentation.isHeld ? (
        <SketchedShape
          shape={{ kind: "path", d: "M375 96 h15 v324 h-15" }}
          profile={options.presentation.tokens.sketch.shape}
          data-held-bracket="true"
          stroke={options.presentation.tokens.color.highlight}
          strokeWidth={options.presentation.scales.stroke(
            options.presentation.tokens.stroke.heavy,
          )}
          fill="none"
          opacity={options.presentation.motion.reveal(options.props.frame, 91)}
        />
      ) : undefined}
      <ReleaseDispositionLabel {...options.presentation} />
      <LabelSlots
        labels={[[options.props.input.labels.example, 60, 596, 840, 12, 1]]}
      />
    </>
  );
}
