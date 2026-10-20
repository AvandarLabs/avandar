/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop  } from "@avandar/utils";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { mapClusterUnfoldContract as contract } from "../MapClusterUnfold.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../MapClusterUnfold.fixtures";
import { inputSchema, type Input } from "../MapClusterUnfold.schema";
import {
  render,
  _marks,
  _attribute,
  _number,
  getVisibleTexts,
} from "./MapClusterUnfoldTestHelpers";

test("grouping preserves every identity and returns to authored coordinates", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    [52, 75, 98, 120, 139, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      const points = _marks({ markup, name: "point" });
      assert.equal(points.length, input.points.length);
      assert.equal(
        new Set(
          points.map((mark) =>
            _attribute({ markup: mark, name: "data-point" }),
          ),
        ).size,
        input.points.length,
      );
      assert.equal(
        _number({
          markup: _marks({ markup, name: "total" })[0],
          name: "data-total",
        }),
        input.points.length,
      );
    });
    const grouped = _marks({
      markup: render({ frame: 98, input: input }),
      name: "cluster",
    });
    assert.deepEqual(
      grouped.map((mark) => _number({ markup: mark, name: "data-count" })),
      input.clusters.map(
        (cluster: Input["clusters"][number]) =>
          input.points.filter(propEq("clusterId", cluster.id)).length,
      ),
    );
    const initial = _marks({
        markup: render({ frame: 52, input: input }),
        name: "point",
      }),
      middle = _marks({
        markup: render({ frame: 75, input: input }),
        name: "point",
      }),
      final = _marks({
        markup: render({ frame: 139, input: input }),
        name: "point",
      });
    initial.forEach((mark, i) => {
      assert.equal(
        _number({ markup: final[i], name: "cx" }),
        _number({ markup: mark, name: "cx" }),
      );
      assert.equal(
        _number({ markup: final[i], name: "cy" }),
        _number({ markup: mark, name: "cy" }),
      );
      const point = input.points[i];
      assert.equal(
        _number({ markup: final[i], name: "cx" }),
        48 + point.x * 4.8,
      );
      assert.equal(
        _number({ markup: final[i], name: "cy" }),
        140 + point.y * 3.6,
      );
    });
    if (input === DEFAULT_INPUT) {
      assert.notEqual(
        _number({ markup: initial[0], name: "cx" }),
        _number({ markup: middle[0], name: "cx" }),
      );
    }
  });
});

test("fixtures retain exact input while schemas reject invalid documents", () => {
  fixtures.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "clusterId"],
  getVisibleTexts,
  textFrames: [40, 98, 150],
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render,
  excludedTextFields: ["id", "clusterId"],
  getVisibleTexts,
});

registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["points", 0, "label"],
    ["points", 1, "label"],
    ["points", 2, "label"],
    ["points", 3, "label"],
    ["clusters", 0, "label"],
    ["clusters", 1, "label"],
    ["labels", "points"],
    ["labels", "clusters"],
    ["labels", "total"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});

test("three coincident cluster anchors retain unequal counts and exact empty references", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    clusters: [
      { id: "", label: "Same", x: 50, y: 50 },
      { id: "界 key", label: "Same", x: 50, y: 50 },
      { id: "W".repeat(12), label: "Same", x: 50, y: 50 },
    ],
    points: Array.from({ length: 8 }, (_, index) => ({
      id: index === 0 ? "" : String(index),
      label: "Same",
      x: 50,
      y: 50,
      clusterId: index === 0 ? "" : index < 3 ? "界 key" : "W".repeat(12),
    })),
    showMemberIds: false,
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = render({ frame: 98, input: input });
  assert.deepEqual(
    _marks({ markup, name: "cluster" }).map((mark) =>
      _number({ markup: mark, name: "data-count" }),
    ),
    [1, 2, 5],
  );
  assert.equal(_marks({ markup, name: "roster-point" }).length, 8);
  assert.deepEqual(
    _marks({ markup, name: "location-count" }).map((mark) =>
      _number({ markup: mark, name: "data-location-count" }),
    ),
    [8],
  );
  assert.doesNotMatch(markup, /data-literal-value/);
});

test("roster leaders remain attached to each moving point identity", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) =>
    [52, 75, 98, 120, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        points = _marks({ markup, name: "point" }),
        leaders = _marks({ markup, name: "point-leader" });
      assert.equal(leaders.length, input.points.length);
      leaders.forEach((leader, index) => {
        assert.equal(
          _attribute({ markup: leader, name: "data-point-leader" }),
          input.points[index].id,
        );
        assert.equal(
          _attribute({ markup: leader, name: "d" }),
          `M${_number({ markup: points[index], name: "cx" })} ${_number({ markup: points[index], name: "cy" })} L584 ${149 + index * 44}`,
        );
      });
    }),
  );
});

test("grouped map badges remain visible for every reviewed hold frame", () => {
  Array.from({ length: 18 }, (_, index) => 82 + index).forEach((frame) => {
    const markup = render({ frame: frame }),
      badges = _marks({ markup, name: "location-count" });
    assert.deepEqual(
      badges.map((badge) =>
        _number({ markup: badge, name: "data-location-count" }),
      ),
      [2, 2],
      `frame ${frame}`,
    );
    DEFAULT_INPUT.points.forEach((point, index) => {
      const cluster = DEFAULT_INPUT.clusters.find(
        propEq("id", point.clusterId),
      )!;
      const marker = _marks({ markup, name: "point" })[index];
      assert.equal(
        _number({ markup: marker, name: "cx" }),
        48 + cluster.x * 4.8,
      );
      assert.equal(
        _number({ markup: marker, name: "cy" }),
        140 + cluster.y * 3.6,
      );
    });
    assert.equal(_marks({ markup, name: "roster-point" }).length, 4);
  });
  [81, 100].forEach((frame) => {
    assert.equal(
      _marks({
        markup: render({ frame: frame }),
        name: "location-count",
      }).filter(
        (badge) =>
          _number({ markup: badge, name: "data-location-count" }) === 2,
      ).length,
      0,
    );
    assert.notEqual(
      _number({
        markup: _marks({ markup: render({ frame: frame }), name: "point" })[0],
        name: "cx",
      }),
      48 + DEFAULT_INPUT.clusters[0].x * 4.8,
    );
  });
});

test("stationary coincident map counts stay intelligible throughout both transitions", () => {
  const input = fixtures[2].input;
  Array.from({ length: 87 }, (_, index) => 53 + index).forEach((frame) => {
    const markup = render({ frame: frame, input: input }),
      badges = _marks({ markup, name: "location-count" });
    assert.deepEqual(
      badges.map((badge) =>
        _number({ markup: badge, name: "data-location-count" }),
      ),
      [8],
      `frame ${frame}`,
    );
    assert.equal(_marks({ markup, name: "point" }).length, 8);
    assert.equal(_marks({ markup, name: "roster-point" }).length, 8);
  });
});

test("fractional cluster anchors hold exact coordinates and complete grouped counts", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    points: DEFAULT_INPUT.points.map((point, index) =>
      index === 0 ? { ...point, x: 5.9 } : point,
    ),
    clusters: [
      { ...DEFAULT_INPUT.clusters[0], x: 24.4, y: 10.2 },
      { ...DEFAULT_INPUT.clusters[1], x: 89.9, y: 89.8 },
    ],
  };
  [82, 90, 98, 99].forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    assert.deepEqual(
      _marks({ markup, name: "location-count" }).map((mark) =>
        _number({ markup: mark, name: "data-location-count" }),
      ),
      [2, 2],
    );
    _marks({ markup, name: "point" }).forEach((mark, index) => {
      const cluster = input.clusters.find(
        (item) => item.id === input.points[index].clusterId,
      )!;
      assert.equal(_number({ markup: mark, name: "cx" }), 48 + cluster.x * 4.8);
      assert.equal(
        _number({ markup: mark, name: "cy" }),
        140 + cluster.y * 3.6,
      );
    });
  });
});
