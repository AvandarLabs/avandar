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
  read,
} from "../../../../../tests/editorControlHarness";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";

test.afterEach(cleanup);
const GROUP_SELECTOR_CONTROL: StockControl = {
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

test("group-relative selectors expose only their own records after another group changes", () => {
  const { view } = _renderGroupedSelectorFixture();
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
  const number = (inputPath: string): StockControl => {
    return {
      kind: "number",
      path: inputPath,
      label: label(inputPath),
      min: 0,
      max: 9,
    };
  };
  const controls: StockControl[] = [
    {
      kind: "object",
      path: "matrix",
      label: label("Matrix"),
      controls: ["0", "1"].map((inputPath) => {
        return {
          kind: "object",
          path: inputPath,
          label: label(inputPath),
          controls: [number("0"), number("1")],
        };
      }),
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

function _renderGroupedSelectorFixture(): Readonly<{
  view: Readonly<ReturnType<typeof render>>;
}> {
  const control = GROUP_SELECTOR_CONTROL;
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
  return { view };
}
