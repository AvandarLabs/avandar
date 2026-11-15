/** Behavioral geometry, exact input contracts and deterministic frame seeks. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { FeedbackRefinement } from "./FeedbackRefinement";
import { feedbackRefinementContract as contract } from "./FeedbackRefinement.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./FeedbackRefinement.fixtures";
import { inputSchema, type Input } from "./FeedbackRefinement.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(FeedbackRefinement, {
        frame,
        input,
        accent: "#72d5bd",
        id: "feedback-test",
      }),
    ),
  );
function _draft({ frame, input }: { frame: number; input: Input }) {
  const markup = render({ frame: frame, input: input });
  const rect = markup.match(/<rect[^>]*data-draft="[^"]*"[^>]*>/)?.[0];
  assert.ok(rect, "The actual travelling draft must be drawn");
  return {
    markup,
    x: SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }),
  };
}
test("each attached feedback note returns with its draft and the next trip starts from that revision", () => {
  const input = fixtures[2].input;
  const first = _draft({ frame: 32, input }),
    review = _draft({ frame: 52, input }),
    returned = _draft({ frame: 88, input });
  assert.ok(review.x > first.x);
  assert.equal(returned.x, first.x);
  assert.ok(
    _draft({ frame: 70, input }).markup.includes(
      `aria-label="${input.rounds[0].feedback}"`,
    ),
  );
  assert.ok(
    returned.markup.includes(`aria-label="${input.rounds[0].revised}"`),
  );
  assert.ok(
    _draft({ frame: 108, input }).markup.includes(
      `aria-label="${input.rounds[1].draft}"`,
    ),
  );
  assert.ok(
    _draft({ frame: 125, input }).markup.includes(
      `aria-label="${input.rounds[1].feedback}"`,
    ),
  );
  assert.ok(
    _draft({ frame: 144, input }).markup.includes(
      `aria-label="${input.rounds[1].revised}"`,
    ),
  );
  assert.ok(
    _draft({ frame: 150, input }).markup.includes(
      `aria-label="${input.finalLabel}"`,
    ),
  );
});
test("single review revises the returned draft before its closing journey", () => {
  assert.ok(
    _draft({ frame: 94, input: DEFAULT_INPUT }).markup.includes(
      `aria-label="${DEFAULT_INPUT.rounds[0].revised}"`,
    ),
  );
  assert.ok(
    _draft({ frame: 132, input: DEFAULT_INPUT }).x >
      _draft({ frame: 94, input: DEFAULT_INPUT }).x,
  );
});
test("invalid revision chains and exact nested keys are rejected", () =>
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  ));

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: [
    "id",
    "insertBeforeId",
    "kind",
    "partitionLayout",
    "draft",
    "revised",
  ],
  getVisibleTexts: ({ input, frame }) => {
    const index = input.rounds.length === 1 ? 0 : frame < 88 ? 0 : 1;
    const round = input.rounds[index];
    return [
      input.artifactLabel,
      input.roleLabels.author,
      input.roleLabels.reviewer,
      frame < (input.rounds.length === 1 ? 94 : 88 + index * 56)
        ? round.draft
        : round.revised,
      round.feedback,
      input.finalLabel,
      ...(input.showRoundLabels ? [round.label] : []),
      ...(input.showReviewTrail ? input.rounds.map(prop("feedback")) : []),
    ];
  },
  textFrames: [150],
});
test("the returned note stays tethered before physically detaching into the review trail", () => {
  const note = (frame: number) => {
    const element = render({ frame: frame }).match(
      /<rect[^>]*data-feedback-round="0"[^>]*>/,
    )?.[0];
    assert.ok(element, "Each feedback note needs its own travelling rectangle");
    return element;
  };
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: note(70), name: "x" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: note(90), name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: note(102), name: "y" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: note(94), name: "y" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: note(120), name: "y" }),
    500,
  );
  const clips = (frame: number) =>
    [
      ...render({ frame: frame }).matchAll(/<clipPath[^>]*>\s*(<rect[^>]*>)/g),
    ].map((match) => match[1]);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: clips(62)[1],
      name: "width",
    }),
    0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: clips(82)[1],
      name: "width",
    }) > 0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: clips(94)[1],
      name: "width",
    }),
    268,
  );
});
test("maximum revision copy keeps complete authored text while the wipe traverses whole fixed slots", () => {
  ["界界界界界界 界界界界界界", "A\nB\tC\nD", "é👩‍🔬"].forEach((text) => {
    const draft = `${text} A`,
      revised = `${text} B`;
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      rounds: [{ label: "Pass", draft, feedback: text, revised }],
    });
    [32, 62, 78, 94, 132].forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      assert.ok(markup.includes(`aria-label="${draft}"`));
      assert.ok(markup.includes(`aria-label="${revised}"`));
      assert.doesNotMatch(markup, />[\u0300-\u036f\u200d]/u);
    });
  });
});
