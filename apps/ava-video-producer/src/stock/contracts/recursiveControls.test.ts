import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { stockI18n } from "../i18n/stockI18n/stockI18n";
import { stockContracts } from "../registry/stockContracts";
import type {
  StockControl,
  StockMessageDescriptor,
} from "./StockContract.types";

function _getControlMessages(
  control: Readonly<StockControl>,
): StockMessageDescriptor[] {
  return [
    control.label,
    ...(control.help ? [control.help] : []),
    ...(control.kind === "number" && control.unit ? [control.unit] : []),
    ...(control.kind === "select" && "options" in control
      ? control.options.map(prop("label"))
      : []),
    ...(control.kind === "union" ? control.variants.map(prop("label")) : []),
  ];
}

function _flatten({
  controls,
  prefix = "",
}: {
  controls: readonly StockControl[];
  prefix?: string;
}): Map<string, StockControl> {
  const result = new Map<string, StockControl>();
  controls.forEach((control) => {
    const path = [prefix, control.path].filter(Boolean).join(".");
    result.set(path, control);
    const nested =
      control.kind === "object"
        ? _flatten({ controls: control.controls, prefix: path })
        : control.kind === "collection"
          ? _flatten({ controls: control.itemControls, prefix: `${path}.*` })
          : new Map<string, StockControl>();
    nested.forEach((child, key) => result.set(key, child));
    if (control.kind === "union") {
      control.variants.forEach((variant) =>
        _flatten({
          controls: [variant.control],
          prefix: `${path}:${variant.valueType}`,
        }).forEach((child, key) => result.set(key, child)),
      );
    }
  });
  return result;
}

test("every nested editor control and authored option has readable translated copy", () => {
  const failures = Object.values(stockContracts).flatMap((contract) =>
    [..._flatten({ controls: contract.controls })].flatMap(([path, control]) =>
      _getControlMessages(control).flatMap((descriptor) => {
        const translated = stockI18n._(descriptor);
        return !descriptor.message.trim() ||
          !translated.trim() ||
          translated === descriptor.id ||
          /(^|\.)PLACE(\.|$)/i.test(descriptor.id)
          ? [{ preset: contract.id, path, ...descriptor, translated }]
          : [];
      }),
    ),
  );
  assert.deepEqual(failures, []);
});

test("coordinate triage exposes complete nullable numeric and literal string editors", () => {
  const controls = _flatten({
    controls: stockContracts["coordinate-quality-triage"].controls,
  });
  ["latitude", "longitude"].forEach((axis) => {
    const control = controls.get(`rows.*.${axis}`)!;
    assert.equal(control.kind, "union");
    assert.equal(control.nullable, true);
    if (control.kind === "union") {
      assert.deepEqual(control.variants.map(prop("valueType")).sort(), [
        "number",
        "string",
      ]);
    }
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(controls.get(`rows.*.${axis}:number`)!).filter(([key]) =>
          ["kind", "path", "min", "max"].includes(key),
        ),
      ),
      { path: "", kind: "number", min: -360, max: 360 },
    );
    const text = controls.get(`rows.*.${axis}:string`)!;
    assert.equal(text.kind, "text");
    if (text.kind === "text") {
      assert.deepEqual(
        [text.path, text.minLength, text.maxLength],
        ["", 0, 10],
      );
    }
  });
});

test("nested geographic numeric controls retain exact tuple positions and authored bounds", () => {
  const expectations = [
    ["geometry-detail-budget", "vertices.*.0", 5, 95],
    ["geometry-detail-budget", "vertices.*.1", 5, 95],
    ["geometry-detail-budget", "tolerance", 0, 30],
    ["coordinate-frame-registration", "landmarks.*.x", 0, 100],
    ["coordinate-frame-registration", "landmarks.*.y", 0, 100],
    ["coordinate-frame-registration", "transform.scaleX", 0.25, 2],
    ["coordinate-frame-registration", "transform.scaleY", 0.25, 2],
    ["coordinate-frame-registration", "transform.offsetX", -50, 50],
    ["coordinate-frame-registration", "transform.offsetY", -50, 50],
    ["travel-time-network-frontier", "nodes.*.x", 5, 95],
    ["travel-time-network-frontier", "nodes.*.y", 5, 95],
    ["travel-time-network-frontier", "roads.*.minutes", 1, 20],
    ["travel-time-network-frontier", "budgetMinutes", 1, 40],
    ["bounded-location-displacement", "locations.*.x", 10, 90],
    ["bounded-location-displacement", "locations.*.y", 10, 90],
    ["bounded-location-displacement", "locations.*.offsetX", -20, 20],
    ["bounded-location-displacement", "locations.*.offsetY", -20, 20],
    ["bounded-location-displacement", "radiusUnits", 0, 20],
  ] as const;
  expectations.forEach(([preset, path, min, max]) => {
    const control = _flatten({ controls: stockContracts[preset].controls }).get(
      path,
    )!;
    assert.equal(control.kind, "number", `${preset}.${path}`);
    if (control.kind === "number") {
      assert.deepEqual(
        [control.min, control.max],
        [min, max],
        `${preset}.${path}`,
      );
    }
  });
});

test("early upper-only text descriptors retain empty inputs recursively", () => {
  const paths = {
    "paired-contrast": ["alternatives.*.id", "criteria.*.id"],
    "capability-matrix": ["options.*.id", "capabilities.*.id"],
    "decision-fork": [
      "branches.*.id",
      "branches.*.condition",
      "branches.*.outcome",
    ],
    "tradeoff-pivot": ["gains.*.id", "concessions.*.id"],
    "argument-bridge": ["premises.*.id"],
    "scope-aperture": ["topics.*.id"],
    "qualify-apparent-conflict": ["statements.*.id"],
    "shared-foundation": ["approaches.*.id"],
  } as const;
  Object.entries(paths).forEach(([preset, fields]) => {
    const controls = _flatten({
      controls: stockContracts[preset as keyof typeof paths].controls,
    });
    fields.forEach((path) => {
      const control = controls.get(path)!;
      assert.equal(control.kind, "text");
      if (control.kind === "text") {
        assert.equal(control.minLength, 0, `${preset}.${path}`);
      }
    });
  });
});
