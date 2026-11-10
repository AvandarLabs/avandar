import { TruncatedText } from "@avandar/ui";
import css from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.module.css";
import type { IHeaderParams } from "ag-grid-community";
import type { ReactNode } from "react";

/**
 * The text of one grid column title. A title that does not fit the header
 * ends in an ellipsis, and hovering it shows the full name. Sort, filter,
 * and resize stay on the grid's own header around this text.
 */
export function DataGridColumnTitle({
  displayName,
}: IHeaderParams): ReactNode {
  return (
    <TruncatedText
      className={css.columnTitle}
      tooltipProps={{ position: "bottom" }}
    >
      {displayName}
    </TruncatedText>
  );
}
