import { DemoTheme } from "../DemoTheme";
import css from "./ColumnWipePreview.module.css";
import type { ReactNode } from "react";

const COLUMNS = 8;
const COLUMN_IDS = Array.from({ length: COLUMNS }, (_, position) => {
  return `column-${position}`;
});
type Props = { progress: readonly number[]; stagger: number };
/** Draws the stepped column wipe samples shown by StaggerColumnDemo. */
export function ColumnWipePreview({
  progress,
  stagger,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.columnWipePreviewColumns}>
      {progress.map((columnProgress, index) => {
        return (
          <div
            key={COLUMN_IDS[index]}
            className={css.columnWipePreviewColumnCell}
          >
            <div className={css.columnWipePreviewColumnTrack}>
              <span
                className={css.columnWipePreviewColumnFill}
                style={{ height: `${(columnProgress * 100).toFixed(2)}%` }}
              />
            </div>
            <span
              className={css.columnWipePreviewCaption}
            >{`${DemoTheme.formatReadout({
              value: index * stagger,
              digits: 1,
            })}f`}</span>
          </div>
        );
      })}
    </div>
  );
}
