import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { Motion } from "../../src/motion";
import { ImportFormView } from "./ImportFormView";
import css from "./ImportScreen.module.css";
import { SavedSource } from "./SavedSource/SavedSource";
import { SourceList } from "./SourceList";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  height: number;
};
ModuleRegistry.registerModules([AllCommunityModule]);
/** Duration of the import reenactment, in frames. */
export const IMPORT_DURATION = 660;
/** Measured pointer targets and click frames for the import film. */
export const IMPORT_BEATS = [
  { frame: 45, target: "import-upload", action: "click" },
  { frame: 124, target: "import-name", action: "click" },
  { frame: 205, target: "import-description", action: "click" },
  { frame: 420, target: "import-save", action: "click" },
] as const;
/**
 * Frame-controlled assembly of Avandar's real import presentation components.
 * Parent arrangement follows DataImportView, ManualUploadView,
 * DatasetImportForm, and DatasetMetaView. No application clients are mounted.
 */
export function ImportScreen({
  frame,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const saved = frame >= 456;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        background: "var(--ava-surface-raised)",
      }}
    >
      <SourceList saved={saved} />
      <div className={css.importScreenBody}>
        {frame < 474 ? <ImportFormView frame={frame} /> : null}
        {saved ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "var(--ava-surface-raised)",
              opacity: Motion.ramp({
                frame,
                at: 456,
                dur: 18,
              }),
            }}
          >
            <SavedSource />
          </div>
        ) : null}
      </div>
    </div>
  );
}
export { ImportScreen as Screen };
