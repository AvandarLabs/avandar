import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { useTransferArtifactPresentation } from "./useTransferArtifactPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useTransferArtifactPresentation>,
  "artifact" | "x" | "y" | "showIdentityTabs"
>;
/** Render the transfer artifact labels. */
export function TransferArtifactLabels(props: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [props.artifact.label, props.x + 36, props.y + 15, 196, 14, 3],
        ...(props.showIdentityTabs
          ? [
              [props.artifact.id, props.x + 36, props.y + 62, 196, 12, 2] as [
                string,
                number,
                number,
                number,
                12,
                number,
              ],
            ]
          : []),
      ]}
    />
  );
}
