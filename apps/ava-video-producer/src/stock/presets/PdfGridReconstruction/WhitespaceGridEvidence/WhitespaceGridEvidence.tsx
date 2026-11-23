import { useWhitespaceGridEvidencePresentation } from "./useWhitespaceGridEvidencePresentation";
import { WhitespaceCorridors } from "./WhitespaceCorridors";
import type { Input } from "../PdfGridReconstruction.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Selected structural evidence derives from the supplied grid geometry. */
export function WhitespaceGridEvidence(props: Readonly<Props>): ReactNode {
  const presentation = useWhitespaceGridEvidencePresentation(props);

  return (
    <g>
      {" "}
      {props.input.signal === "whitespace" ? (
        <WhitespaceCorridors {...presentation} />
      ) : undefined}
    </g>
  );
}
