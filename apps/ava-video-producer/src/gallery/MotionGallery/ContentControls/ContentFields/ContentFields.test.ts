import assert from "node:assert/strict";
import test from "node:test";
import { ContentFields } from "./ContentFields";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";

const LABEL: Record<"id" | "message", string> = {
  id: "test.label",
  message: "Value",
};
test("nullable controls distinguish explicit null from empty authored values", () => {
  const controls: StockControl[] = [
    {
      kind: "text",
      path: "",
      label: LABEL,
      minLength: 0,
      maxLength: 20,
      nullable: true,
    },
    {
      kind: "number",
      path: "",
      label: LABEL,
      min: 0,
      max: 10,
      nullable: true,
    },
    {
      kind: "select",
      path: "",
      label: LABEL,
      nullable: true,
      options: [],
    },
    {
      kind: "object",
      path: "",
      label: LABEL,
      nullable: true,
      controls: [
        {
          kind: "text",
          path: "label",
          label: LABEL,
          minLength: 1,
          maxLength: 20,
        },
      ],
    },
  ];
  assert.deepEqual(controls.map(ContentFields.getBlankValueFromControl), [
    "",
    "",
    "",
    {
      label: "",
    },
  ]);
});
test("union selection preserves numeric strings as authored text", () => {
  const control: StockControl = {
    kind: "union",
    path: "",
    label: LABEL,
    nullable: true,
    variants: [
      {
        valueType: "string",
        label: LABEL,
        control: {
          kind: "text",
          path: "",
          label: LABEL,
          minLength: 0,
          maxLength: 20,
        },
      },
      {
        valueType: "number",
        label: LABEL,
        control: {
          kind: "number",
          path: "",
          label: LABEL,
          min: -90,
          max: 90,
        },
      },
    ],
  };
  assert.equal(
    ContentFields.getVariantFromValue({ control, value: "12.50" })?.valueType,
    "string",
  );
  assert.equal(
    ContentFields.getVariantFromValue({ control, value: 12.5 })?.valueType,
    "number",
  );
  assert.equal(
    ContentFields.getVariantFromValue({ control, value: null })?.valueType,
    "string",
  );
  assert.equal(ContentFields.getBlankValueFromControl(control), "");
});
test("item-relative reference options stay inside the current group's records", () => {
  const control: StockControl = {
    kind: "select",
    path: "retainedId",
    label: LABEL,
    optionsFrom: {
      path: "records",
      valueKey: "id",
      labelKey: "label",
      scope: "item",
    },
  };
  const first = {
    records: [
      {
        id: "a",
        label: "First group",
      },
    ],
  };
  const second = {
    records: [
      {
        id: "b",
        label: "Second group",
      },
    ],
  };
  const root = {
    groups: [first, second],
    records: [
      {
        id: "wrong",
        label: "Root",
      },
    ],
  };
  assert.deepEqual(
    ContentFields.getOptionsFromControl({ control, root, item: first }),
    [
      {
        value: "a",
        label: "First group",
      },
    ],
  );
  assert.deepEqual(
    ContentFields.getOptionsFromControl({ control, root, item: second }),
    [
      {
        value: "b",
        label: "Second group",
      },
    ],
  );
});
