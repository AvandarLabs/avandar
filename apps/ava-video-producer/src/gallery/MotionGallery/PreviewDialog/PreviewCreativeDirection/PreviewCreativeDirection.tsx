import css from "./PreviewCreativeDirection.module.css";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";

type Props = Pick<PreviewProps, "preset">;
/** Displays the authored creative direction in PreviewDetails. */
export function PreviewCreativeDirection({
  preset,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewCreativeDirectionBriefExcerpt}>
      <h3>Creative direction</h3>
      <p>{preset.prompt}</p>
    </div>
  );
}
