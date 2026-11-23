import css from "./PreviewExportNotice.module.css";
import type { ReactNode } from "react";

type Props = { exportStatus: string; notice: string };
/** Announces export progress and reference-copy feedback in PreviewDetails. */
export function PreviewExportNotice({
  exportStatus,
  notice,
}: Readonly<Props>): ReactNode {
  return (
    <p
      className={css.previewExportNoticeDialogNotice}
      role="status"
      aria-live="polite"
    >
      {exportStatus ||
        notice ||
        "Conceptual graphics. No Avandar product footage."}
    </p>
  );
}
