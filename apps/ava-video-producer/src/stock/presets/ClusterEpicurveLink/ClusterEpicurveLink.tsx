import { CaseCopy } from "./CaseCopy";
import { CaseHistogram } from "./CaseHistogram";
import { CaseIdentityGuides } from "./CaseIdentityGuides";
import { CaseMap } from "./CaseMap";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
/** Inputs for ClusterEpicurveLink. */
type Props = GraphicProps & { input: Input };

/**
 * Linked map and onset bins retain all cases through two independent
 * selections.
 */
export function ClusterEpicurveLink({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-investigation-count={input.investigationCaseIds.length}
      data-total-cases={input.cases.length}
    >
      <CaseMap input={input} frame={frame} accent={accent} />
      <CaseHistogram input={input} frame={frame} accent={accent} />
      <CaseIdentityGuides input={input} frame={frame} accent={accent} />
      <CaseCopy input={input} />
    </g>
  );
}
