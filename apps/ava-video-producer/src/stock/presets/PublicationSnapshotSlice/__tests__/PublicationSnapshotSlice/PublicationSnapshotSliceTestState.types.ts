import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT } from "../../PublicationSnapshotSlice.fixtures";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertReversedArbitraryStringCopiesLabelsOptions = {
  labels: ReturnType<
    typeof SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup
  >;
  column: NonNullable<(typeof DEFAULT_INPUT)["table"]["columns"]>[number];
  input: Readonly<typeof DEFAULT_INPUT>;
  frame: number | number;
  paint: ReturnType<
    typeof SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup
  >;
  columnIndex: number;
  left: number;
  right: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertReversedArbitraryStringCopiesColumnIdOptions = {
  columnId: (typeof DEFAULT_INPUT)["selection"]["columnIds"][number];
  selectedColumn: number;
  input: Readonly<typeof DEFAULT_INPUT>;
  numColumns: number;
  paint: ReturnType<
    typeof SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup
  >;
  frame: number | number;
};
