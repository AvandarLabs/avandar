import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockGraphic } from "../../StockGraphic";
import { DECISION_FORK_DENSE_INPUT } from "./DecisionFork.fixtures";

test("the SVG shows the authored selected outcome without default-only content", () => {
  const input = structuredClone(DECISION_FORK_DENSE_INPUT);
  input.branches[1].outcome = "Author approved result";
  const markup = renderToStaticMarkup(
    createElement(StockGraphic, {
      preset: "decision-fork",
      frame: 150,
      schemaVersion: 1,
      input,
      accent: "#aabbcc",
      background: "#112233",
    }),
  );
  assert.match(markup, /Author approved result/);
  assert.match(markup, /#aabbcc/);
  assert.match(markup, /#112233/);
  assert.doesNotMatch(
    markup,
    /Review folder|Where does the fictional sketch belong/,
  );
});

function _markerPosition(markup: string): number[] {
  const marker = markup.match(
    /data-marker-branch="[^"]+"[^>]*><circle cx="([^"]+)" cy="([^"]+)"/,
  );
  assert.ok(marker, "The single scenario marker must be present");
  return [Number(marker[1]), Number(marker[2])];
}

test("only the selected branch receives the traveling scenario marker", () => {
  Array.from([2, 3, 4]).forEach((branchCount) => {
    Array.from(
      { length: Math.max(0, Math.ceil((branchCount - 0) / 1)) },
      (_, sampleIndex) => 0 + sampleIndex * 1,
    ).forEach((selectedIndex) => {
      const input = {
        ...DECISION_FORK_DENSE_INPUT,
        branches: DECISION_FORK_DENSE_INPUT.branches.slice(0, branchCount),
        selectedBranchId: DECISION_FORK_DENSE_INPUT.branches[selectedIndex].id,
      };
      const render = ({ frame }: Readonly<{ frame: number }>) =>
        renderToStaticMarkup(
          createElement(StockGraphic, {
            preset: "decision-fork",
            frame,
            input,
          }),
        );
      assert.deepEqual(_markerPosition(render({ frame: 50 })), [480, 235]);
      const final = render({ frame: 150 });
      assert.equal((final.match(/data-marker-branch=/g) ?? []).length, 1);
      assert.match(
        final,
        new RegExp(`data-marker-branch="${input.selectedBranchId}"`),
      );
      assert.deepEqual(_markerPosition(final), [
        40 + (880 / branchCount) * (selectedIndex + 0.5),
        408,
      ]);
      input.branches.forEach((branch) => {
        const closedOpacity = branch.id === input.selectedBranchId ? 0 : 1;
        assert.match(
          final,
          new RegExp(
            `<g opacity="${closedOpacity}"[^>]+data-closed-gate="${branch.id}"`,
          ),
        );
      });
    });
  });
});

test("hiding alternate outcomes keeps the selected route and its condition", () => {
  const render = ({
    showUnchosenOutcomes,
  }: Readonly<{ showUnchosenOutcomes: boolean }>) =>
    renderToStaticMarkup(
      createElement(StockGraphic, {
        preset: "decision-fork",
        frame: 150,
        input: { ...DECISION_FORK_DENSE_INPUT, showUnchosenOutcomes },
      }),
    );
  const shown = render({ showUnchosenOutcomes: true });
  const hidden = render({ showUnchosenOutcomes: false });
  assert.match(shown, /Continue to review/);
  assert.doesNotMatch(
    hidden,
    /Continue to review|Hold for a response|Keep in the archive/,
  );
  assert.match(hidden, /Return to the notebook/);
  assert.match(hidden, /Ready for review/);
  assert.deepEqual(_markerPosition(hidden), _markerPosition(shown));
});

test("the complete contract rejects foreign branch IDs and keeps authored selection under all fixture counts", async () => {
  const { decisionForkContract } = await import("./DecisionFork.contract");
  assert.equal(
    decisionForkContract.inputSchema.safeParse({
      ...decisionForkContract.defaultInput,
      selectedBranchId: "missing",
    }).success,
    false,
  );
  assert.equal(decisionForkContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(decisionForkContract.fixtures.map(prop("id")), [
    "default",
    "minimum",
    "dense",
    "changed",
  ]);
  decisionForkContract.fixtures.forEach(({ input }) => {
    assert.deepEqual(decisionForkContract.inputSchema.parse(input), input);
    const render = ({ frame }: Readonly<{ frame: number }>) =>
      renderToStaticMarkup(
        createElement(StockGraphic, { preset: "decision-fork", frame, input }),
      );
    const samples = [0, 36, 90, 150, 179].map((frame) => ({
      frame,
      markup: render({ frame: frame }),
    }));
    [...samples]
      .reverse()
      .forEach(({ frame, markup }) =>
        assert.equal(render({ frame: frame }), markup),
      );
    assert.equal(
      (render({ frame: 150 }).match(/data-marker-branch=/g) ?? []).length,
      1,
    );
    assert.match(
      render({ frame: 150 }),
      new RegExp(`data-marker-branch="${input.selectedBranchId}"`),
    );
  });
});

test("strict decision documents reject duplicate, foreign and extra branch fields", async () => {
  const { inputSchema } = await import("./DecisionFork.schema");
  const { invalidInputs } = await import("./DecisionFork.fixtures");
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

test("shown alternative outcomes retain readable text contrast", async () => {
  const { decisionForkContract: correctionContract } =
    await import("./DecisionFork.contract");
  const { DecisionFork: Component } = await import("./DecisionFork");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source, showUnchosenOutcomes: true };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    input.branches.forEach((branch) => {
      const labels = paint.filter(
        (item) => item.kind === "text" && item.ariaLabel === branch.outcome,
      );
      assert.ok(labels.length > 0);
      labels.forEach((label) =>
        assert.ok(
          label.opacity >= 0.8,
          "Every explicitly shown outcome retains readable contrast",
        ),
      );
    });
  });
});
