/**
 * The shared harness preserves caller-owned fields and the existing samples.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { z } from "zod";
import { registerStockTextLayoutAssertions } from "./registerStockTextLayoutAssertions";
const inputSchema = z.strictObject({
  id: z.literal("literal-id"),
  learnerIds: z.array(z.literal("learner-a")),
  nestedReferences: z.array(z.array(z.literal("nested-id"))),
  visibleStrings: z.array(z.string().max(18)),
  items: z.array(
    z.strictObject({
      id: z.literal("nested-object-id"),
      channel: z.literal("phone"),
      label: z.string().max(18),
    }),
  ),
  label: z.string().max(18),
  count: z.literal(7),
  visible: z.boolean(),
  optional: z.null(),
}) satisfies z.ZodType;
type Input = z.output<typeof inputSchema>;
const dense: Input = {
  id: "literal-id",
  learnerIds: ["learner-a"],
  nestedReferences: [["nested-id"]],
  visibleStrings: ["Visible array text"],
  items: [{ id: "nested-object-id", channel: "phone", label: "界".repeat(18) }],
  label: "界".repeat(18),
  count: 7,
  visible: true,
  optional: null,
};
const SNAPSHOTS: Array<{ frame: number; input: Input }> = [];
const ORACLE_FRAMES: number[] = [];
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures: [
    { input: dense },
    { input: { ...dense, visible: false } },
    { input: dense },
  ],
  excludedTextFields: ["id", "channel", "learnerIds", "nestedReferences"],
  getVisibleTexts: ({ input, frame }) => {
    ORACLE_FRAMES.push(frame);
    return input.visible ? [input.label, input.items[0].label] : [];
  },
  render: ({ frame, input }) => {
    SNAPSHOTS.push({ frame, input });
    return input.visible
      ? `<text x="100" y="100" font-size="12" aria-label="${input.label}">${input.label}</text><text x="100" y="200" font-size="12" aria-label="${input.items[0].label}">${input.items[0].label}</text>`
      : "<g/>";
  },
});
test("registration keeps nested exclusions, caller oracles and all existing stress samples", () => {
  assert.equal(SNAPSHOTS.length, 510);
  assert.deepEqual(
    ORACLE_FRAMES,
    Array.from({ length: 40 }, () => [24, 72, 150]).flat(),
  );
  assert.deepEqual(SNAPSHOTS.slice(0, 120).map(prop("frame")), ORACLE_FRAMES);
  assert.equal(SNAPSHOTS[0].input.label, "界 界 界界界界界界界界界界界界界界");
  assert.equal(SNAPSHOTS[0].input.items[0].label, SNAPSHOTS[0].input.label);
  SNAPSHOTS.forEach(({ input }) => {
    assert.equal(input.id, "literal-id");
    assert.deepEqual(input.learnerIds, ["learner-a"]);
    assert.deepEqual(input.nestedReferences, [["nested-id"]]);
    assert.equal(input.items[0].id, "nested-object-id");
    assert.equal(input.items[0].channel, "phone");
    assert.equal(input.count, 7);
    assert.equal(input.optional, null);
  });
  assert.deepEqual(
    SNAPSHOTS.slice(120, 390).map(prop("frame")),
    Array.from({ length: 3 }, () =>
      Array.from({ length: 90 }, (_, index) => index * 2),
    ).flat(),
  );
  assert.equal(dense.label, "界".repeat(18));
  assert.deepEqual(dense.learnerIds, ["learner-a"]);
  assert.deepEqual(dense.nestedReferences, [["nested-id"]]);
  assert.deepEqual(dense.visibleStrings, ["Visible array text"]);
  assert.notEqual(
    SNAPSHOTS[0].input.visibleStrings[0],
    dense.visibleStrings[0],
  );
  assert.notEqual(SNAPSHOTS[0].input.items[0].label, dense.items[0].label);
});
