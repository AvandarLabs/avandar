import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import {
  render,
  fireEvent,
  cleanup,
  Harness,
  label,
  text,
  read,
} from "../../../../../tests/editorControlHarness";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";

test.afterEach(cleanup);
const NULLABLE_CONTROL_FIXTURES: StockControl[] = [
  {
    ...text("Text"),
    nullable: true,
  },
  {
    kind: "number",
    path: "Number",
    label: label("Number"),
    min: 0,
    max: 10,
    nullable: true,
  },
  {
    kind: "select",
    path: "Reference",
    label: label("Reference"),
    options: [
      {
        value: "a",
        label: label("Authored record"),
      },
    ],
    nullable: true,
  },
  {
    kind: "object",
    path: "Object",
    label: label("Object"),
    controls: [text("Object label", "label")],
    nullable: true,
  },
];

const UNION_CONTROL_FIXTURES: StockControl[] = [
  {
    kind: "union",
    path: "coordinate",
    label: label("Coordinate"),
    nullable: true,
    variants: [
      {
        valueType: "string",
        label: label("Text"),
        control: text("Coordinate", ""),
      },
      {
        valueType: "number",
        label: label("Number"),
        control: {
          kind: "number",
          path: "",
          label: label("Coordinate"),
          min: -90,
          max: 90,
        },
      },
    ],
  },
];

test("nullable text, number, reference and object controls retain explicit null and empty authored data", () => {
  const controls = NULLABLE_CONTROL_FIXTURES;
  const view = render(
    createElement(Harness, {
      controls,
      draft: {
        Text: null,
        Number: null,
        Reference: null,
        Object: null,
      },
    }),
  );
  _assertNullableTextAndNumberEdits(view);
  fireEvent.click(view.getByLabelText("Empty value for Reference"));
  fireEvent.change(
    view.getByLabelText("Reference", {
      exact: true,
    }),
    {
      target: {
        value: "option:0",
      },
    },
  );
  assert.equal(read(view).Reference, "a");
  fireEvent.click(view.getByLabelText("Empty value for Object"));
  assert.deepEqual(read(view).Object, {
    label: "",
  });
  fireEvent.change(
    view.getByLabelText("Object label", {
      exact: true,
    }),
    {
      target: {
        value: "My label",
      },
    },
  );
  assert.deepEqual(read(view).Object, {
    label: "My label",
  });
});

test("union editor keeps numeric strings as strings and number selection accepts an initially blank number", () => {
  const controls = UNION_CONTROL_FIXTURES;
  const view = render(
    createElement(Harness, {
      controls,
      draft: {
        coordinate: "12.50",
      },
    }),
  );
  _assertNumericUnionSelection(view);
  fireEvent.change(view.getByLabelText("Value type for Coordinate"), {
    target: {
      value: "string",
    },
  });
  fireEvent.change(
    view.getByLabelText("Coordinate", {
      exact: true,
    }),
    {
      target: {
        value: "12.50",
      },
    },
  );
  assert.equal(read(view).coordinate, "12.50");
  fireEvent.click(view.getByLabelText("Empty value for Coordinate"));
  assert.equal(read(view).coordinate, null);
});

function _assertNullableTextAndNumberEdits(
  view: Readonly<ReturnType<typeof render>>,
): void {
  fireEvent.click(view.getByLabelText("Empty value for Text"));
  fireEvent.change(
    view.getByLabelText("Text", {
      exact: true,
    }),
    {
      target: {
        value: "Authored",
      },
    },
  );
  assert.equal(read(view).Text, "Authored");
  fireEvent.click(view.getByLabelText("Empty value for Text"));
  assert.equal(read(view).Text, null);
  fireEvent.click(view.getByLabelText("Empty value for Number"));
  assert.equal(read(view).Number, "");
  fireEvent.change(
    view.getByLabelText("Number", {
      exact: true,
    }),
    {
      target: {
        value: "3",
      },
    },
  );
  assert.equal(read(view).Number, 3);
}

function _assertNumericUnionSelection(
  view: Readonly<ReturnType<typeof render>>,
): void {
  assert.equal(read(view).coordinate, "12.50");
  fireEvent.change(view.getByLabelText("Value type for Coordinate"), {
    target: {
      value: "number",
    },
  });
  assert.equal(
    view
      .getByLabelText("Coordinate", {
        exact: true,
      })
      .getAttribute("type"),
    "number",
  );
  assert.equal(read(view).coordinate, "");
  fireEvent.change(
    view.getByLabelText("Coordinate", {
      exact: true,
    }),
    {
      target: {
        value: "12.5",
      },
    },
  );
  assert.equal(read(view).coordinate, 12.5);
}
