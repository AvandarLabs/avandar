import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT } from "../../PublicationSnapshotSlice.fixtures";
import { assertReversedArbitraryStringCopiesColumnId as _assertReversedArbitraryStringCopiesColumnId } from "./assertReversedArbitraryStringCopiesColumnId";
import { PublicationSnapshotTestHelpers } from "./PublicationSnapshotTestHelpers";

/**
 * Asserts reversed arbitrary-string copies retain readable destination
 * column attribution from first copy through settling.
 */
export function assertReversedArbitraryStringCopiesFrame({
  frame,
  input,
  numColumns,
}: Readonly<{
  frame: number | number[][number];
  input: Readonly<typeof DEFAULT_INPUT>;
  numColumns: number;
}>): void {
  const markup = PublicationSnapshotTestHelpers.render({ frame, input }),
    paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  input.selection.columnIds.forEach((columnId, selectedColumn) => {
    return _assertReversedArbitraryStringCopiesColumnId({
      columnId,
      selectedColumn,
      input,
      numColumns,
      paint,
      frame,
    });
  });
  SvgPaintAssertions.assertTextCanvasBounds({ markup });
  PublicationSnapshotTestHelpers.assertReadablePaint(markup);
}
