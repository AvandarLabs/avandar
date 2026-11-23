import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { render, options } = PeerContributionRecognitionTestState;
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { peerContributionRecognitionContract } from "../../PeerContributionRecognition.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PeerContributionRecognition.fixtures";
import { inputSchema } from "../../PeerContributionRecognition.schema";
import { assertCompleteContributionCaptionsClearInput as _assertCompleteContributionCaptionsClearInput } from "./assertCompleteContributionCaptionsClearInput";
import { assertFocusMovesPointingFingertipContribution as _assertFocusMovesPointingFingertipContribution } from "./assertFocusMovesPointingFingertipContribution";
import { assertHiddenAuthorshipStaysVisiblyIndex as _assertHiddenAuthorshipStaysVisiblyIndex } from "./assertHiddenAuthorshipStaysVisiblyIndex";

test("complete rejection fixtures reject structural and reference violations", () => {
  return invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("focus moves the pointing fingertip and acknowledgment anchor to the authored object", () => {
  const input = fixtures[3].input;
  input.contributions.forEach((contribution) => {
    return _assertFocusMovesPointingFingertipContribution({
      contribution,
      input,
    });
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("hidden authorship stays visibly beside the focused stationary work throughout hold", () => {
  [0, 1].forEach((index) => {
    return _assertHiddenAuthorshipStaysVisiblyIndex(index);
  });
});

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, exampleLabel: "R&D <x>\t界\n👩‍🔬" };
  assert.deepEqual(inputSchema.parse(supplied), supplied);
  assert.ok(
    render({ frame: 90, input: supplied }).includes(
      'aria-label="R&amp;D &lt;x&gt;\t界\n👩‍🔬"',
    ),
  );
});

test("distinct maximum-length participant names retain whole graphemes and fixed text slots", () => {
  [`界 ${"界".repeat(14)} 界`, "é👩‍🔬é👩‍🔬é"].forEach((label) => {
    const input = inputSchema.parse({
      ...fixtures[2].input,
      people: { contributor: label, colleague: "V".repeat(18) },
    });
    const markup = render({ frame: 150, input: input });
    assert.ok(markup.includes(`aria-label="${label}"`));
    assert.ok(markup.includes(`aria-label="${input.people.colleague}"`));
  });
});

test("complete contribution captions clear both acknowledgment containers and their objects", () => {
  [
    DEFAULT_INPUT,
    fixtures[2].input,
    {
      ...fixtures[2].input,
      contributions: fixtures[2].input.contributions.map((item) => {
        return {
          ...item,
          label: `界 ${"界".repeat(9)} ${"界".repeat(28)}`.slice(0, 28),
        };
      }),
      acknowledgment: {
        ...fixtures[2].input.acknowledgment,
        text: `界 ${"界".repeat(27)} ${"界".repeat(52)}`.slice(0, 52),
      },
    },
  ].forEach((input) => {
    return _assertCompleteContributionCaptionsClearInput(input);
  });
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(peerContributionRecognitionContract.controls))
      .digest("hex"),
    "b04fa4551c3d1cb9b89aba289936696e45c011b9d3b1e6bd954b629302c6b5d4",
  );
});
