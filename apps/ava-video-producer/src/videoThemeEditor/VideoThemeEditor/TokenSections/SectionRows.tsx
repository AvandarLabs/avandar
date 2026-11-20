import { TokenRow } from "../../TokenRow/TokenRow";
import {
  type TokenRowGroup,
  type TokenRow as TokenRowData,
} from "../../tokenRows/tokenRows.types";
import { AddScaleValue } from "./AddScaleValue";
import type { ReactNode } from "react";

type Props = TokenRowGroup &
  Readonly<{
    /** Every row in the editor, unfiltered, so new keys never collide. */
    allRows: readonly TokenRowData[];
  }>;
/** The rows of one open section, with an add-value action for an atomic one. */
export function SectionRows({ group, rows, allRows }: Props): ReactNode {
  return (
    <>
      {rows.map((row) => {
        return <TokenRow key={row.path} row={row} />;
      })}
      {group.startsWith("atomic:") ? (
        <AddScaleValue group={group} rows={rows} allRows={allRows} />
      ) : null}
    </>
  );
}
