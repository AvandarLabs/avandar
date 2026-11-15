import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunityCoordinationTable } from "./CommunityCoordinationTable";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./CommunityCoordinationTable.fixtures";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(CommunityCoordinationTable, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("only supplied team reassignment moves and open requests survive", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-team=/g) ?? []).length,
    DEFAULT_INPUT.teams.length,
  );
  assert.equal((markup.match(/data-team-moved="true"/g) ?? []).length, 1);
  assert.equal(
    (markup.match(/data-request=/g) ?? []).length,
    DEFAULT_INPUT.places.length,
  );
});

test("changed authored input emits its physical scene", () => {
  assert.notEqual(
    renderToStaticMarkup(
      createElement(CommunityCoordinationTable, {
        frame: 150,
        input: CHANGED_INPUT,
        accent: "#9fefca",
        id: "test",
      }),
    ),
    "",
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";

test("one team lifts its own marker from maximum initial concentration, preserving all request tags", () => {
  fixtures.forEach(({ input }) => {
    const markers = (frame: number) => [
      ..._render({ frame: frame, input: input }).matchAll(
        /<g data-team="([^"]*)"[^>]*data-x="([^"]*)" data-y="([^"]*)"/g,
      ),
    ];
    const before = markers(24);
    const final = markers(150);
    assert.equal(final.length, input.teams.length);
    final.forEach((marker, index) => {
      const team = input.teams[index];
      assert.equal(
        marker[0] === before[index][0],
        team.initialPlaceId === team.agreedPlaceId,
      );
    });
    const carried = _render({ frame: 70, input: input });
    const marker =
      markers(70)[
        input.teams.findIndex(
          (team) => team.initialPlaceId !== team.agreedPlaceId,
        )
      ];
    assert.ok(marker);
    const hand = carried.match(/<circle data-team-hand[^>]*>/);
    assert.ok(hand);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
      Number(marker[2]),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
      Number(marker[3]),
    );
    const target = input.places.find(
      (place) =>
        place.id ===
        input.teams.find((team) => team.initialPlaceId !== team.agreedPlaceId)!
          .agreedPlaceId,
    )!;
    const pointing = _render({ frame: 36, input: input }).match(
      /<circle data-community-hand[^>]*>/,
    );
    assert.ok(pointing);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: pointing[0],
        name: "cx",
      }),
      340 + target.x * 270,
    );
    assert.equal(
      (
        _render({
          frame: 150,
          input: { ...input, showUnassignedRequests: false },
        }).match(/data-request=/g) ?? []
      ).length,
      input.places.length,
    );
  });
  assert.doesNotMatch(
    _render({ frame: 150, input: CHANGED_INPUT }),
    /data-unassigned-caption/,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { communityCoordinationTableContract } from "./CommunityCoordinationTable.contract";
import { inputSchema, type Input } from "./CommunityCoordinationTable.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.scenarioCaption,
    input.communityLabel,
    frame >= 108 ? input.planLabels.agreed : input.planLabels.initial,
    ...input.places.flatMap((place) => [
      place.label,
      place.requestLabel,
      ...(frame >= 108 &&
      input.showUnassignedRequests &&
      !input.teams.some(propEq("agreedPlaceId", place.id))
        ? [input.planLabels.unassigned]
        : []),
    ]),
    ...input.teams.flatMap((team) => [team.label, team.serviceLabel]),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "initialPlaceId",
  "agreedPlaceId",
  "markerStyle",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: communityCoordinationTableContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("minimum empty identifiers and maximum accepted collections stay schema-valid", () => {
  assert.deepEqual(inputSchema.parse(MINIMUM_INPUT), MINIMUM_INPUT);
  assert.deepEqual(inputSchema.parse(DENSE_INPUT), DENSE_INPUT);
});
test("emitted marker shapes occupy the exact agreed places with separate concentrated slots", () => {
  fixtures.forEach(({ input }) => {
    const markup = _render({ frame: 150, input: input });
    const groups = [
      ...markup.matchAll(/<g data-team="[^"]*"[^>]*>(.*?)<\/g>/g),
    ];
    assert.equal(groups.length, input.teams.length);
    groups.forEach((group, index) => {
      const place = input.places.find(
        (candidate) => candidate.id === input.teams[index].agreedPlaceId,
      )!;
      const expectedX = 340 + place.x * 270 + (index % 2 === 0 ? -8.5 : 8.5);
      const expectedY = 160 + place.y * 280 + (index < 2 ? -10.5 : 10.5);
      if (input.markerStyle === "wooden-pieces") {
        const rectangle = group[1].match(/<rect[^>]*>/);
        assert.ok(rectangle);
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle[0],
            name: "x",
          }) + 7,
          expectedX,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle[0],
            name: "y",
          }) + 9,
          expectedY,
        );
      } else {
        const flag = group[1].match(/d="M([^ ]+) ([^ ]+)/);
        assert.ok(flag);
        assert.equal(Number(flag[1]) + 6, expectedX);
        assert.equal(Number(flag[2]) - 9, expectedY);
      }
    });
  });
  assert.ok(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      teams: DEFAULT_INPUT.teams.map((team) => ({
        ...team,
        serviceLabel: "Advice desk",
      })),
    }).success,
  );
});

import { registerCoordinationReviewAssertions } from "./registerCoordinationReviewAssertions";

registerCoordinationReviewAssertions(_render);
