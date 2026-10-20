import assert from "node:assert/strict";
import test from "node:test";
import { fixtures } from "../DuplicateReviewStack.fixtures";
import { inputSchema, type Input } from "../DuplicateReviewStack.schema";
import { render } from "./DuplicateReviewStackTestHelpers";

test("dense comparison pairs preserve maximum data and inefficiently packed labels", () => {
  const input: Input = {
    ...fixtures[2].input,
    finalView: "comparison-pair",
    groups: fixtures[2].input.groups.map((group) => ({
      ...group,
      records: group.records.map((record) => ({
        ...record,
        label: `界 ${"界".repeat(17)} ${"界".repeat(6)}`,
        comparisonValue: `${" \t\n\r".repeat(5)}  `,
      })),
    })),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  [36, 70, 85, 100, 150].forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    input.groups.forEach((group) =>
      group.records.forEach((record) =>
        assert.ok(markup.includes(`aria-label="${record.comparisonValue}"`)),
      ),
    );
  });
  assert.equal(
    inputSchema.safeParse({
      ...fixtures[1].input,
      groups: [
        {
          ...fixtures[1].input.groups[0],
          records: [
            fixtures[1].input.groups[0].records[0],
            fixtures[1].input.groups[0].records[0],
          ],
        },
      ],
    }).success,
    false,
  );
});
