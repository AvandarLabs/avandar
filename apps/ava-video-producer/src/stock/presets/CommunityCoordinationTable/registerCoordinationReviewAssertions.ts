import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT, fixtures } from "./CommunityCoordinationTable.fixtures";
import { inputSchema, type Input } from "./CommunityCoordinationTable.schema";
function _createCloseInput({
  movingIndex,
  angle = 44.4,
  markerStyle = "wooden-pieces",
}: {
  movingIndex: number;
  angle?: number;
  markerStyle?: Input["markerStyle"];
}): Input {
  const radians = (angle * Math.PI) / 180;
  return inputSchema.parse({
    ...DEFAULT_INPUT,
    markerStyle,
    places: [
      {
        id: "a",
        label: "Area A",
        x: 0.4,
        y: 0.4,
        requestLabel: "Information requested",
      },
      {
        id: "b",
        label: "Area B",
        x: 0.4 + 0.200123 * Math.cos(radians),
        y: 0.4 + 0.200123 * Math.sin(radians),
        requestLabel: "Information requested",
      },
    ],
    teams: Array.from({ length: 4 }, (_, index) => ({
      id: String(index),
      label: `Team ${index}`,
      serviceLabel: "Information",
      initialPlaceId: "a",
      agreedPlaceId: index === movingIndex ? "b" : "a",
    })),
  });
}
function _getMarkerBounds(markup: string) {
  return [...markup.matchAll(/<g data-team="[^"]*"[^>]*>(.*?)<\/g>/g)].map(
    (group) => {
      const rectangle = group[1].match(/<rect[^>]*>/);
      if (rectangle) {
        return {
          x:
            SvgAttributes.getNumberFromMarkup({
              attributes: rectangle[0],
              name: "x",
            }) - 1,
          y:
            SvgAttributes.getNumberFromMarkup({
              attributes: rectangle[0],
              name: "y",
            }) - 1,
          width: 16,
          height: 20,
        };
      }
      const flag = group[1].match(/d="M([^ ]+) ([^ ]+) V([^ ]+) H([^ ]+)/);
      assert.ok(flag);
      return {
        x: Number(flag[1]) - 1,
        y: Number(flag[3]) - 1,
        width: Number(flag[4]) - Number(flag[1]) + 2,
        height: Number(flag[2]) - Number(flag[3]) + 2,
      };
    },
  );
}

/**
 * Register close-place separation and visible assignment ownership regressions.
 */
export function registerCoordinationReviewAssertions(
  render: (options: Readonly<{ frame: number; input: Input }>) => string,
): void {
  test("I3 final full marker shapes remain disjoint for nearby diagonal places and every moving index", () => {
    ["flags", "wooden-pieces"].forEach((markerStyle) =>
      Array.from({ length: 4 }, (_, index) => index).forEach((movingIndex) =>
        Array.from({ length: 72 }, (_, index) => index * 5 + 1).forEach(
          (angle) => {
            const input = _createCloseInput({
              movingIndex,
              angle,
              markerStyle: markerStyle as Input["markerStyle"],
            });
            const boxes = _getMarkerBounds(
              render({ frame: 150, input: input }),
            );
            boxes.forEach((box, index) =>
              boxes
                .slice(index + 1)
                .forEach((other) =>
                  assert.ok(
                    box.x + box.width <= other.x ||
                      other.x + other.width <= box.x ||
                      box.y + box.height <= other.y ||
                      other.y + other.height <= box.y,
                    `overlap: ${movingIndex}, ${angle}, ${markerStyle}`,
                  ),
                ),
            );
          },
        ),
      ),
    );
  });
  test("I4 named places, team tokens and each open request have visible ownership", () => {
    const input = DEFAULT_INPUT,
      markup = render({ frame: 150, input: input });
    input.places.forEach((place, index) => {
      const connector = [
        ...markup.matchAll(
          /<path data-place-connector="([^"]*)"[^>]*d="([^"]*)"/g,
        ),
      ].find((match) => match[1] === place.id);
      assert.ok(connector, `missing visible place connector ${index}`);
      assert.ok(
        connector[2].endsWith(`L${340 + place.x * 270} ${160 + place.y * 280}`),
      );
    });
    const open = markup.match(/<g data-unassigned-caption="c"[^>]*>(.*?)<\/g>/);
    assert.ok(open);
    assert.match(open[1], /Request remains open/);
    input.teams.forEach((team, index) => {
      const token = [
        ...markup.matchAll(/<g data-team="([^"]*)"[^>]*>(.*?)<\/g>/g),
      ].find((match) => match[1] === team.id);
      assert.ok(token);
      assert.match(token[2], new RegExp(`data-team-key[^>]*>${index + 1}<`));
    });
    assert.equal(
      (
        render({
          frame: 150,
          input: { ...input, showUnassignedRequests: false },
        }).match(/data-request=/g) ?? []
      ).length,
      input.places.length,
    );
  });
  test("I3 exact review diagonal and every destination index have disjoint emitted marker bounds", () => {
    const exact = inputSchema.parse({
      ..._createCloseInput({ movingIndex: 0 }),
      places: [
        {
          id: "a",
          label: "Area A",
          x: 0.15,
          y: 0.15,
          requestLabel: "Information requested",
        },
        {
          id: "b",
          label: "Area B",
          x: 0.293,
          y: 0.29,
          requestLabel: "Information requested",
        },
      ],
    });
    const variants = [
      exact,
      ...["flags", "wooden-pieces"].flatMap((markerStyle) =>
        Array.from({ length: 4 }, (_, destinationIndex) =>
          Array.from({ length: 4 }, (_team, movingIndex) => {
            const input = _createCloseInput({
              movingIndex,
              angle: 44.4,
              markerStyle: markerStyle as Input["markerStyle"],
            });
            const places = [
              input.places[0],
              {
                id: "c",
                label: "Area C",
                x: 0.15,
                y: 0.85,
                requestLabel: "Information requested",
              },
              {
                id: "d",
                label: "Area D",
                x: 0.85,
                y: 0.15,
                requestLabel: "Information requested",
              },
            ];
            places.splice(destinationIndex, 0, input.places[1]);
            return inputSchema.parse({ ...input, places });
          }),
        ).flat(),
      ),
    ];
    variants.forEach((input) => {
      const boxes = _getMarkerBounds(render({ frame: 150, input: input }));
      boxes.forEach((box, index) =>
        boxes
          .slice(index + 1)
          .forEach((other) =>
            assert.ok(
              box.x + box.width <= other.x ||
                other.x + other.width <= box.x ||
                box.y + box.height <= other.y ||
                other.y + other.height <= box.y,
            ),
          ),
      );
    });
  });
  test("I4 keys visibly join raw labels, assignments and every open caption including empty and Unicode IDs", () => {
    fixtures.forEach(({ input }) => {
      const markup = render({ frame: 150, input: input });
      const legends = [
        ...markup.matchAll(
          /<g data-team-legend="([^"]*)" data-assignment-place="([^"]*)"[^>]*>(.*?)<\/g>/g,
        ),
      ];
      assert.equal(legends.length, input.teams.length);
      legends.forEach((legend, index) => {
        const team = input.teams[index],
          placeIndex = input.places.findIndex(propEq("id", team.agreedPlaceId));
        assert.equal(legend[1], team.id);
        assert.equal(legend[2], team.agreedPlaceId);
        assert.match(
          legend[3],
          new RegExp(`data-team-legend-key[^>]*>${index + 1}<`),
        );
        assert.match(
          legend[3],
          new RegExp(
            `data-assignment-key[^>]*>${String.fromCharCode(65 + placeIndex)}<`,
          ),
        );
        assert.ok(legend[3].includes(`aria-label="${team.label}"`));
        assert.ok(legend[3].includes(`aria-label="${team.serviceLabel}"`));
      });
      const open = [
        ...markup.matchAll(
          /<g data-unassigned-caption="([^"]*)"[^>]*>(.*?)<\/g>/g,
        ),
      ];
      const unassigned = input.places.filter(
        (place) => !input.teams.some(propEq("agreedPlaceId", place.id)),
      );
      assert.equal(
        open.length,
        input.showUnassignedRequests ? unassigned.length : 0,
      );
      open.forEach((caption) => {
        const index = input.places.findIndex(propEq("id", caption[1]));
        assert.match(
          caption[2],
          new RegExp(
            `data-open-place-key[^>]*>${String.fromCharCode(65 + index)}<`,
          ),
        );
        assert.ok(
          caption[2].includes(`aria-label="${input.planLabels.unassigned}"`),
        );
      });
      const hidden = render({
        frame: 150,
        input: { ...input, showUnassignedRequests: false },
      });
      assert.doesNotMatch(hidden, /data-unassigned-caption/);
      assert.equal(
        (hidden.match(/data-request-card=/g) ?? []).length,
        input.places.length,
      );
    });
  });
  test("I4 the community role rail clears complete fourth-place request copy", () => {
    const markup = render({ frame: 150, input: fixtures[2].input });
    const role = [...markup.matchAll(/<text[^>]*>/g)].find(
      (match) =>
        SvgAttributes.getNumberFromMarkup({
          attributes: match[0],
          name: "y",
        }) === 530,
    );
    assert.ok(role);
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: role[0], name: "x" }) >=
        340,
    );
  });
}
