import { JoinMissingPartner } from "../JoinMissingPartner";
import type { getJoinRowLayoutFromInputAndFrame } from "../getJoinRowLayoutFromInputAndFrame";
import type { getJoinRowVisibility } from "../getJoinRowVisibility";
import type { Input } from "../KeyedRowZipper.schema";
import type { ReactNode } from "react";

type Props = {
  visibility: ReturnType<typeof getJoinRowVisibility>;
  row: Input["leftRows"][number];
  y: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["y"];
  input: Input;
  progress: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["progress"];
};

/** Renders the outline with authored geometry. */
export function JoinRowMissingPartner({
  visibility,
  row,
  y,
  input,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {visibility.showMissingPartner ? (
        <JoinMissingPartner
          rowKey={row.key}
          y={y}
          label={input.labels.missing}
          progress={progress}
        />
      ) : undefined}
    </>
  );
}
