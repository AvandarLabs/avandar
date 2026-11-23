import { TokenRow } from "../../TokenRow/TokenRow";
import { AddScaleValue } from "./AddScaleValue";
import type {
  TokenRow as TokenRowModel,
  TokenRowGroup,
} from "../../tokenRows/tokenRows";

type Props = TokenRowGroup &
  Readonly<{
    /** Every row in the editor, unfiltered, so new keys never collide. */
    allRows: readonly TokenRowModel[];
  }>;

/** The rows of one open section, with an add-value action for an atomic one. */
export function SectionRows({ group, rows, allRows }: Props) {
  return (
    <>
      {rows.map((row) => (
        <TokenRow key={row.path} row={row} />
      ))}
      {group.startsWith("atomic:") ? (
        <AddScaleValue group={group} rows={rows} allRows={allRows} />
      ) : null}
    </>
  );
}
