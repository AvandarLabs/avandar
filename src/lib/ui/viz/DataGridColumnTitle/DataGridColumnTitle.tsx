import { TruncatedText } from "@avandar/ui";
import { Group } from "@mantine/core";
import { useContext } from "react";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { ColumnCodesContext } from "@/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext";
import css from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.module.css";
import type { IHeaderParams } from "ag-grid-community";
import type { ReactNode } from "react";

/**
 * The text of one grid column title. A title that does not fit the header
 * ends in an ellipsis, and hovering it shows the full name. A column with a
 * code list in `ColumnCodesContext` gets a tag that opens it. Sort, filter,
 * and resize stay on the grid's own header around this text.
 */
export function DataGridColumnTitle({ displayName }: IHeaderParams): ReactNode {
  const codes = useContext(ColumnCodesContext).get(displayName);
  const title = (
    <TruncatedText
      className={css.columnTitle}
      tooltipProps={{ position: "bottom" }}
    >
      {displayName}
    </TruncatedText>
  );
  if (!codes) {
    return title;
  }
  return (
    <Group gap={4} wrap="nowrap" miw={0}>
      {title}
      <CodeListPopover columnName={displayName} codes={codes} />
    </Group>
  );
}
