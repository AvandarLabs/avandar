/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_INPUT, fixtures } from "../MapClusterUnfold.fixtures";
import { inputSchema, type Input } from "../MapClusterUnfold.schema";
import {
  render,
  _marks,
  _attribute,
  _number,
} from "./MapClusterUnfoldTestHelpers";

test("held and stationary location badges paint readable counts over their actual markers", () => {
  [
    {
      input: DEFAULT_INPUT,
      frames: Array.from({ length: 18 }, (_, index) => 82 + index),
      counts: [2, 2],
    },
    {
      input: fixtures[2].input,
      frames: Array.from({ length: 87 }, (_, index) => 53 + index),
      counts: [8],
    },
  ].forEach(({ input, frames, counts }) =>
    frames.forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        badges = [
          ...markup.matchAll(/<g data-location-count="(\d+)">(.*?)<\/g>/g),
        ];
      assert.deepEqual(
        badges.map(([, value]) => Number(value)),
        counts,
      );
      badges.forEach(([, value, content]) => {
        const circle = content.match(/<circle[^>]*>/)![0],
          text = content.match(/<text([^>]*)>(.*?)<\/text>/)!;
        assert.equal(text[2], value);
        assert.equal(_number({ markup: text[1], name: "font-size" }), 12);
        assert.equal(_attribute({ markup: text[1], name: "fill" }), "#edf7f4");
        assert.equal(
          _number({ markup: text[1], name: "x" }),
          _number({ markup: circle, name: "cx" }),
        );
        assert.equal(
          _number({ markup: text[1], name: "y" }),
          _number({ markup: circle, name: "cy" }) + 4,
        );
        assert.ok(content.indexOf("<text") > content.indexOf("<circle"));
        assert.doesNotMatch(
          content,
          /opacity="0"|visibility="hidden"|display="none"/,
        );
      });
    }),
  );
});

test("mixed trajectories retain the occupied stationary badge when moving members join", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    points: [
      { id: "s1", label: "Stationary one", x: 50, y: 50, clusterId: "a" },
      { id: "s2", label: "Stationary two", x: 50, y: 50, clusterId: "a" },
      { id: "m", label: "Moving", x: 10, y: 50, clusterId: "b" },
    ],
    clusters: [
      { id: "a", label: "Stationary", x: 50, y: 50 },
      { id: "b", label: "Moving", x: 90, y: 50 },
    ],
  };
  assert.deepEqual(inputSchema.parse(input), input);
  [input, { ...input, points: [...input.points].reverse() }].forEach(
    (authored) => {
      [
        ...Array.from({ length: 87 }, (_, index) => 53 + index),
        67.5,
        118.5,
        119.5,
      ].forEach((frame) => {
        const markup = render({ frame: frame, input: authored }),
          points = _marks({ markup, name: "point" });
        assert.equal(points.length, 3);
        assert.equal(
          new Set(
            points.map((point) =>
              _attribute({ markup: point, name: "data-point" }),
            ),
          ).size,
          3,
        );
        points
          .filter(
            (point) =>
              _attribute({ markup: point, name: "data-point" }) !== "m",
          )
          .forEach((point) => {
            assert.equal(_number({ markup: point, name: "cx" }), 288);
            assert.equal(_number({ markup: point, name: "cy" }), 320);
          });
        const badges = [
          ...markup.matchAll(/<g data-location-count="(\d+)">(.*?)<\/g>/g),
        ];
        const occupied = badges.find(([, , content]) => {
          const circle = content.match(/<circle[^>]*>/)![0];
          return (
            _number({ markup: circle, name: "cx" }) === 288 &&
            _number({ markup: circle, name: "cy" }) === 320
          );
        });
        assert.ok(
          occupied,
          `Stationary occupied location must remain visible at frame ${frame}`,
        );
        const expected = frame === 119 || frame === 67.5 ? 3 : 2;
        assert.equal(Number(occupied[1]), expected);
        assert.ok(occupied[2].includes(`>${expected}</text>`));
        assert.doesNotMatch(
          occupied[2],
          /opacity="0"|visibility="hidden"|display="none"/,
        );
        if (frame === 119 || frame === 67.5) {
          points.forEach((point) => {
            assert.equal(_number({ markup: point, name: "cx" }), 288);
            assert.equal(_number({ markup: point, name: "cy" }), 320);
          });
        }
      });
      assert.deepEqual(
        _marks({
          markup: render({ frame: 139, input: authored }),
          name: "point",
        }).map((point) => [
          _number({ markup: point, name: "cx" }),
          _number({ markup: point, name: "cy" }),
        ]),
        authored.points.map((point) => [
          48 + point.x * 4.8,
          140 + point.y * 3.6,
        ]),
      );
    },
  );
});
