import type { ReactNode } from "react";

import css from "./DiagnosticSample.module.css";

type Props = { values: readonly string[] | undefined };

/** Renders one capped sample list when the executor may disclose it. */
export function DiagnosticSample({ values }: Props): ReactNode {
  return values?.length ? (
    <div className={css.diagnosticSample}>{values.join(", ")}</div>
  ) : null;
}
