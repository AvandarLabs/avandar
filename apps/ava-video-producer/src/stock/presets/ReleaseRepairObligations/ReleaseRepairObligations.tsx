import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ReleaseArtifact } from "./ReleaseArtifact/ReleaseArtifact";
import { ReleaseRecipientBay } from "./ReleaseRecipientBay";
import { RepairRegisterAndHeldBracket } from "./RepairRegisterAndHeldBracket";
import { useReleaseRepairObligationsPresentation } from "./useReleaseRepairObligationsPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/**
 * A physical release gate preserves every unresolved limitation and commitment.
 */
export function ReleaseRepairObligations(props: Readonly<Props>): ReactNode {
  const presentation = useReleaseRepairObligationsPresentation(props);

  return (
    <g>
      <ReleaseRecipientBay {...presentation} />
      <g opacity={presentation.motion.reveal(props.frame, 12)}>
        <LabelSlots
          labels={[
            [props.input.labels.resolved, 60, 35, 200, 12, 3],
            [props.input.labels.open, 300, 35, 200, 12, 3],
          ]}
        />
      </g>
      <ReleaseArtifact
        input={props.input}
        frame={props.frame}
        accent={props.accent}
        artifactX={presentation.artifactX}
      />
      <RepairRegisterAndHeldBracket props={props} presentation={presentation} />
    </g>
  );
}
