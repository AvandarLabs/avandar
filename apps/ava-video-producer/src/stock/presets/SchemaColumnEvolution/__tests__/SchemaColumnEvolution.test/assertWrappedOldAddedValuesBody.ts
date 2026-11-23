import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertWrappedOldAddedValuesBodyOptions } from "./SchemaColumnEvolutionTestState";

/** Asserts wrapped old and added values stay inside each physical row. */
export function assertWrappedOldAddedValuesBody({
  body,
  index,
  texts,
  records,
  input,
}: Readonly<AssertWrappedOldAddedValuesBodyOptions>): void {
  const y = SvgAttributes.getNumberFromMarkup({
    attributes: body[0],
    name: "y",
  });
  const right =
    SvgAttributes.getNumberFromMarkup({ attributes: body[0], name: "x" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body[0], name: "width" });
  const rowTexts = texts.filter((text) => {
    return text.y >= y && text.y < y + 60;
  });
  const record = records[index];
  assert.deepEqual(
    rowTexts.map(prop("label")).sort(),
    [
      record.label,
      record.id,
      record.recordedValue,
      index < input.earlierRecords.length
        ? input.fields.missingLabel
        : (input.laterRecord.addedValue ?? input.fields.missingLabel),
    ].sort(),
  );
  rowTexts.forEach((text) => {
    assert.ok(text.bottom <= y + 60);
    assert.ok(text.right <= right);
  });
}
