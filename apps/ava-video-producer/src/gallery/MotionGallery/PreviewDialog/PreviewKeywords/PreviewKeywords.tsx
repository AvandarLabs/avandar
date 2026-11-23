import css from "./PreviewKeywords.module.css";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";

type Props = Pick<PreviewProps, "preset">;
/** Lists the selected motion keywords within PreviewDetails. */
export function PreviewKeywords({ preset }: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewKeywordsKeywordList} aria-label="Keywords">
      {preset.tags.map((tag) => {
        return <span key={tag}>{tag}</span>;
      })}
    </div>
  );
}
