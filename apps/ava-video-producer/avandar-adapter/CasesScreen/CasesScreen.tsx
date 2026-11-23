import { CaseTypeHome } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome";
import { CaseRecordBrowser } from "./CaseRecordBrowser";
import { caseType } from "./CasesScreen.constants";
import css from "./CasesScreen.module.css";
import { CaseTypeBrowser } from "./CaseTypeBrowser";
import { useCasesVideoTargets } from "./useCasesVideoTargets";
import type { ReactNode } from "react";
import "@mantine/tiptap/styles.css";

const _noop = () => {
  return undefined;
};
type Props = {
  frame: number;
  width: number;
  height: number;
};

/**
 * Body-local times. The movie's cursor measures these targets after rendering.
 */
export const CASES_BEATS = [
  { frame: 90, target: "cases-type", action: "click" },
  { frame: 250, target: "cases-view-records", action: "click" },
  { frame: 350, target: "cases-record-001", action: "click" },
  { frame: 470, target: "cases-visit-value", action: "point" },
] as const;
/** Duration of the case manager reenactment, in frames. */
export const CASES_DURATION = 660;

/** Real Case Manager leaves with approved, deterministic dataset values. */
export function CasesScreen({
  frame,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const root = useCasesVideoTargets({ frame });
  return (
    <div
      ref={root}
      style={{
        width,
        height,
        overflow: "hidden",
        background: "var(--mantine-color-neutral-0)",
      }}
    >
      {frame < 98 ? (
        <div className={css.casesScreenCaseTypeHomePane}>
          <CaseTypeHome
            caseTypes={[caseType]}
            onCreate={_noop}
            onOpenCaseType={_noop}
            onDeleteCaseType={_noop}
          />
        </div>
      ) : frame < 258 ? (
        <CaseTypeBrowser />
      ) : (
        <CaseRecordBrowser frame={frame} height={height} />
      )}
    </div>
  );
}

export { CasesScreen as Screen };
