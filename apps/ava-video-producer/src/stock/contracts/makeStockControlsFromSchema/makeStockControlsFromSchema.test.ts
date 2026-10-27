/** Exact recursive editor data and explicit unsupported-schema rejection. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "./makeStockControlsFromSchema";
import type { StockControl, StockJsonSchema } from "../StockContract.types";
const PERSON_SCHEMA: StockJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", maxLength: 20 },
    label: { type: "string", minLength: 1, maxLength: 18 },
  },
  required: ["id", "label"],
};
const schema: StockJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    mode: { type: "string", enum: ["spoken", "note"] },
    copy: {
      type: "object",
      additionalProperties: false,
      properties: { text: { type: "string", maxLength: 52 } },
      required: ["text"],
    },
    people: { type: "array", minItems: 1, maxItems: 2, items: PERSON_SCHEMA },
    focus: { type: "string", minLength: 1, maxLength: 20 },
  },
  required: ["enabled", "mode", "copy", "people", "focus"],
};
const REFERENCE_SELECTS: {
  focus: { path: string; valueKey: string; labelKey: string };
} = {
  focus: { path: "people", valueKey: "id", labelKey: "label" },
};
const expected: StockControl[] = [
  {
    path: "enabled",
    label: { id: "fixture.controls.enabled", message: "enabled" },
    kind: "boolean",
  },
  {
    path: "mode",
    label: { id: "fixture.controls.mode", message: "mode" },
    kind: "select",
    options: [
      {
        value: "spoken",
        label: { id: "fixture.controls.mode.spoken", message: "spoken" },
      },
      {
        value: "note",
        label: { id: "fixture.controls.mode.note", message: "note" },
      },
    ],
  },
  {
    path: "copy",
    label: { id: "fixture.controls.copy", message: "copy" },
    kind: "object",
    controls: [
      {
        path: "text",
        label: { id: "fixture.controls.copy.text", message: "text" },
        kind: "text",
        minLength: 0,
        maxLength: 52,
      },
    ],
  },
  {
    path: "people",
    label: { id: "fixture.controls.people", message: "people" },
    kind: "collection",
    minItems: 1,
    maxItems: 2,
    itemSchema: PERSON_SCHEMA,
    itemControls: [
      {
        path: "id",
        label: { id: "fixture.controls.people.id", message: "id" },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: { id: "fixture.controls.people.label", message: "label" },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "focus",
    label: { id: "fixture.controls.focus", message: "focus" },
    kind: "select",
    optionsFrom: { path: "people", valueKey: "id", labelKey: "label" },
  },
];
test("supported recursive shapes retain exact bounds, relative paths and stable message identities", () =>
  assert.deepEqual(
    makeStockControlsFromSchema({
      schema,
      messageNamespace: "fixture",
      referenceSelects: REFERENCE_SELECTS,
    }),
    expected,
  ));
test("exact nested reference overrides preserve their root or item scope", () => {
  const controls = makeStockControlsFromSchema({
    schema,
    messageNamespace: "fixture",
    referenceSelects: {
      "people.id": {
        path: "peers",
        valueKey: "id",
        labelKey: "label",
        scope: "item",
      },
      focus: REFERENCE_SELECTS.focus,
    },
  });
  const people = controls.find(propEq("path", "people"));
  assert.equal(people?.kind, "collection");
  if (people?.kind === "collection") {
    assert.deepEqual(people.itemControls[0], {
      path: "id",
      label: { id: "fixture.controls.people.id", message: "id" },
      kind: "select",
      optionsFrom: {
        path: "peers",
        valueKey: "id",
        labelKey: "label",
        scope: "item",
      },
    });
  }
});
test("unsupported scalar, union, text constraints and unbounded or primitive collections fail explicitly", () => {
  const unsupported: Array<StockJsonSchema | boolean> = [
    true,
    false,
    { type: "number" },
    { type: "null" },
    { anyOf: [{ type: "string" }, { type: "null" }] },
    { type: "string" },
    { type: "string", maxLength: 4, pattern: "x" },
    { type: "string", maxLength: 4, format: "email" },
    { type: "string", minLength: 5, maxLength: 4 },
    { type: "string", maxLength: Infinity },
    { type: "string", enum: [] },
    { type: "string", enum: ["x", "x"] },
    { type: "array", maxItems: 2, items: PERSON_SCHEMA },
    { type: "array", minItems: 1, maxItems: 2, items: true },
    { type: "array", minItems: 1, maxItems: 2, items: false },
    {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", maxLength: 4 },
    },
    { type: "object", additionalProperties: true, properties: {} },
    {
      type: "object",
      additionalProperties: false,
      properties: { optional: { type: "boolean" } },
      required: [],
    },
    { type: "boolean", const: true },
  ];
  unsupported.forEach((node) =>
    assert.throws(
      () =>
        makeStockControlsFromSchema({
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { value: node },
            required: ["value"],
          },
          messageNamespace: "fixture",
        }),
      /Unsupported stock controls schema/,
    ),
  );
});
test("unknown or incompatible reference override paths fail explicitly", () => {
  ["unknown", "enabled", "mode"].forEach((path) =>
    assert.throws(
      () =>
        makeStockControlsFromSchema({
          schema,
          messageNamespace: "fixture",
          referenceSelects: { [path]: REFERENCE_SELECTS.focus },
        }),
      /Unsupported stock controls schema/,
    ),
  );
});
test("conversion preserves the complete source schema and reference descriptors", () => {
  const before = structuredClone({
    schema,
    referenceSelects: REFERENCE_SELECTS,
  });
  makeStockControlsFromSchema({
    schema,
    messageNamespace: "fixture",
    referenceSelects: REFERENCE_SELECTS,
  });
  assert.deepEqual({ schema, referenceSelects: REFERENCE_SELECTS }, before);
});
