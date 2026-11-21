import { PortableWorkTransferTestState } from "./PortableWorkTransferTestState";

const { render, options } = PortableWorkTransferTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { FIXTURES, invalidInputs } from "../../PortableWorkTransfer.fixtures";
import { inputSchema } from "../../PortableWorkTransfer.schema";
import { assertAcceptedCopiesUnloadCompletelyFixture as _assertAcceptedCopiesUnloadCompletelyFixture } from "./assertAcceptedCopiesUnloadCompletelyFixture";
import { assertUnloadingHandFollowsRigidFixture as _assertUnloadingHandFollowsRigidFixture } from "./assertUnloadingHandFollowsRigidFixture";
import { getFolioXFromFrame as _getFolioXFromFrame } from "./getFolioXFromFrame";

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
  });
});

test("each artifact retains its original and one same-ID copy without pending success", () => {
  ["accepted", "awaiting-open"].forEach((transferState) => {
    const input = inputSchema.parse({
      ...FIXTURES[2].input,
      transferState,
      showIdentityTabs: false,
    });
    const hold = render({ frame: 150, input });
    input.artifacts.forEach(({ id }) => {
      assert.equal(
        (hold.match(new RegExp(`data-original="${id}"`, "g")) || []).length,
        1,
      );
      assert.equal(
        (hold.match(new RegExp(`data-transfer-copy="${id}"`, "g")) || [])
          .length,
        1,
      );
    });
    assert.equal(
      hold.includes('data-destination-use="true"'),
      transferState === "accepted",
    );
    assert.equal(
      hold.includes('data-folio-closed="true"'),
      transferState === "awaiting-open",
    );
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["ownerLabel"],
    ["tools", "source"],
    ["tools", "destination"],
    ["artifacts", 0, "label"],
    ["artifacts", 1, "label"],
    ["labels", "originals"],
    ["labels", "copies"],
    ["labels", "portable"],
    ["labels", "received"],
    ["labels", "pending"],
    ["labels", "example"],
  ],
});

test("the complete loaded folio moves rigidly with the owner's contacting hand", () => {
  const input = FIXTURES[2].input;
  const frames = [94, 100, 108, 114];
  const positions = frames.map((frame) => {
    return _getFolioXFromFrame({ frame, input });
  });
  assert.ok(
    positions.every((x, index) => {
      return index === 0 || x > positions[index - 1];
    }),
  );
});

test("pending copy labels remain visible on a closed cover with no accepted caption", () => {
  const input = {
    ...FIXTURES[2].input,
    transferState: "awaiting-open" as const,
    showIdentityTabs: false,
  };
  const markup = render({ frame: 150, input }),
    cover = SvgAttributes.fromMarker({ markup, marker: "folio-cover" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "width" }),
    264,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "opacity" }),
    1,
  );
  assert.ok(
    markup.indexOf("data-folio-cover=") <
      markup.lastIndexOf(`aria-label="${input.artifacts[0].label}"`),
  );
  assert.doesNotMatch(markup, /data-destination-use=/);
});

test("accepted copies unload completely outside the folio onto the destination surface", () => {
  FIXTURES.forEach(({ input: fixture }) => {
    return _assertAcceptedCopiesUnloadCompletelyFixture(fixture);
  });
});

test("the unloading hand follows each rigid copy and stays above the open folio", () => {
  FIXTURES.forEach(({ input: fixture }) => {
    return _assertUnloadingHandFollowsRigidFixture(fixture);
  });
});
