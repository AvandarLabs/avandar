import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import {
  render,
  fireEvent,
  cleanup,
  Harness,
  label,
  text,
  read,
} from "./editorControlHarness";
import type { StockControl } from "../src/stock/contracts/StockContract.types";

test.afterEach(cleanup);

test("nullable text, number, reference and object controls retain explicit null and empty authored data", () => {
  const controls: StockControl[] = [
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
  const controls: StockControl[] = [
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
  const view = render(
    createElement(Harness, {
      controls,
      draft: {
        coordinate: "12.50",
      },
    }),
  );
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

test("group-relative selectors expose only their own records after another group changes", () => {
  const control: StockControl = {
    kind: "collection",
    path: "groups",
    label: label("Groups"),
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
    },
    itemControls: [
      {
        kind: "select",
        path: "retainedId",
        label: label("Retained record"),
        optionsFrom: {
          scope: "item",
          path: "records",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  };
  const view = render(
    createElement(Harness, {
      controls: [control],
      draft: {
        groups: [
          {
            retainedId: "a",
            records: [
              {
                id: "a",
                label: "Group A",
              },
            ],
          },
          {
            retainedId: "b",
            records: [
              {
                id: "b",
                label: "Group B",
              },
            ],
          },
        ],
      },
    }),
  );
  const selectors = view.getAllByLabelText("Retained record", {
    exact: true,
  });
  assert.match(selectors[0].textContent ?? "", /Group A/);
  assert.doesNotMatch(selectors[0].textContent ?? "", /Group B/);
  assert.match(selectors[1].textContent ?? "", /Group B/);
  assert.doesNotMatch(selectors[1].textContent ?? "", /Group A/);
  fireEvent.click(view.getByLabelText("Remove Groups item 1"));
  assert.equal(
    (
      view.getByLabelText("Retained record", {
        exact: true,
      }) as HTMLSelectElement
    ).selectedOptions[0].textContent,
    "Group B",
  );
  assert.deepEqual(read(view).groups, [
    {
      retainedId: "b",
      records: [
        {
          id: "b",
          label: "Group B",
        },
      ],
    },
  ]);
});

test("matrix cells have individual names and edits preserve neighboring cells", () => {
  const number = (inputPath: string): StockControl => ({
    kind: "number",
    path: inputPath,
    label: label(inputPath),
    min: 0,
    max: 9,
  });
  const controls: StockControl[] = [
    {
      kind: "object",
      path: "matrix",
      label: label("Matrix"),
      controls: ["0", "1"].map((inputPath) => ({
        kind: "object",
        path: inputPath,
        label: label(inputPath),
        controls: [number("0"), number("1")],
      })),
    },
  ];
  const view = render(
    createElement(Harness, {
      controls,
      draft: {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      },
    }),
  );
  fireEvent.change(view.getByLabelText("Cell matrix.1.0", { exact: true }), {
    target: { value: "9" },
  });
  assert.deepEqual(read(view).matrix, [
    [1, 2],
    [9, 4],
  ]);
});

test("valid empty references display the authored option rather than the placeholder", () => {
  const controls: StockControl[] = [
    {
      kind: "select",
      path: "choice",
      label: label("Choice"),
      options: [
        { value: "", label: label("Empty authored ID") },
        { value: "a", label: label("Other ID") },
      ],
    },
  ];
  const view = render(
    createElement(Harness, { controls, draft: { choice: "" } }),
  );
  const select = view.getByLabelText("Choice", {
    exact: true,
  }) as HTMLSelectElement;
  assert.equal(select.selectedOptions[0].textContent, "Empty authored ID");
  assert.equal(select.selectedOptions[0].disabled, false);
  assert.equal(read(view).choice, "");
});

test("select options preserve number and string identity through real DOM changes", () => {
  const controls: StockControl[] = [
    {
      kind: "select",
      path: "choice",
      label: label("Choice"),
      options: [
        { value: 1, label: label("Number one") },
        { value: "1", label: label("Text one") },
        { value: "", label: label("Empty ID") },
      ],
    },
  ];
  const view = render(
    createElement(Harness, { controls, draft: { choice: "1" } }),
  );
  const select = view.getByLabelText("Choice", {
    exact: true,
  }) as HTMLSelectElement;
  assert.equal(select.selectedOptions[0].textContent, "Text one");
  ["Number one", "Text one", "Empty ID"].forEach((name, index) => {
    const option = Array.from(select.options).find(
      propEq("textContent", name),
    )!;
    fireEvent.change(select, { target: { value: option.value } });
    assert.equal(read(view).choice, [1, "1", ""][index]);
  });
});

test("missing references stay visibly invalid without replacing authored content", () => {
  const controls: StockControl[] = [
    {
      kind: "select",
      path: "choice",
      label: label("Choice"),
      options: [{ value: "a", label: label("Other ID") }],
    },
  ];
  const view = render(
    createElement(Harness, { controls, draft: { choice: "missing" } }),
  );
  const select = view.getByLabelText("Choice", {
    exact: true,
  }) as HTMLSelectElement;
  assert.equal(select.selectedOptions[0].disabled, true);
  assert.equal(select.selectedOptions[0].textContent, "Choose a value");
  assert.equal(read(view).choice, "missing");
});
