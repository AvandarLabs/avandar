import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  COUNTY,
  GENDER,
  makeApplyFlow,
  makeApplyLookups,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { UnmatchedValuesStep } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/UnmatchedValuesStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const mocks = vi.hoisted(() => {
  return { canEditDictionaries: true };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.canEditDictionaries;
    },
  };
});

const DATASET = { id: "dataset-1", name: "Bronx line list" } as Dataset.T;

function _flow(overrides: Partial<ApplyFlow> = {}): ApplyFlow {
  return makeApplyFlow({
    unmatched: {
      status: "ready",
      result: new Map([
        [GENDER.id, [{ value: "7", valueKey: "7", rowCount: 3 }]],
        [COUNTY.id, [{ value: "Kings", valueKey: "kings", rowCount: 2 }]],
      ]),
    },
    ...overrides,
  });
}

function _render(
  flow: ApplyFlow,
  lookups: ApplyLookups = makeApplyLookups(),
): void {
  const state = {
    ...flow.state,
    picks: {
      ...flow.state.picks,
      [COUNTY.id]: { ...SEX_PICK, mode: "reference" as const },
    },
  };
  render(
    <UnmatchedValuesStep
      dataset={DATASET}
      columns={[GENDER, COUNTY]}
      flow={{ ...flow, state }}
      lookups={lookups}
      preview={null}
    />,
  );
}

describe("UnmatchedValuesStep", () => {
  beforeEach(() => {
    mocks.canEditDictionaries = true;
  });

  it("lists converted values and reference values in their own sections", () => {
    _render(_flow());

    const section = screen.getByRole("region", {
      name: "Values being converted",
    });
    expect(
      within(section).getByRole("row", { name: /GENDER 7 3/ }),
    ).toBeInTheDocument();

    const converted = screen.getByRole("radiogroup", {
      name: "What to do with 7 in GENDER",
    });
    expect(
      within(converted).getByRole("radio", { name: "Keep as is" }),
    ).toBeChecked();
    expect(within(converted).getAllByRole("radio")).toHaveLength(4);
    const reference = screen.getByRole("radiogroup", {
      name: "What to do with Kings in county",
    });
    expect(
      within(reference).getByRole("radio", { name: "Leave unlabeled" }),
    ).toBeChecked();
    expect(within(reference).getAllByRole("radio")).toHaveLength(2);
  });

  it("shows values that differ only in case or spaces as one row", () => {
    _render(
      _flow({
        unmatched: {
          status: "ready",
          result: new Map([
            [
              GENDER.id,
              [
                { value: "x", valueKey: "x", rowCount: 4 },
                { value: " X ", valueKey: "x", rowCount: 1 },
              ],
            ],
          ]),
        },
      }),
    );

    expect(
      screen.getAllByRole("radiogroup", { name: /What to do with/ }),
    ).toHaveLength(1);
    expect(screen.getByRole("row", { name: /GENDER x 5/ })).toBeInTheDocument();
  });

  it("resolves a value, and asks for the label to add", () => {
    const flow = _flow({
      state: {
        ...makeApplyFlow().state,
        resolutions: { [GENDER.id]: { "7": { action: "add", text: "" } } },
      },
    });
    _render(flow);

    fireEvent.click(screen.getByRole("radio", { name: "Leave empty" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Label for 7" }), {
      target: { value: "Other" },
    });

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "7",
      resolution: { action: "empty" },
    });
    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "7",
      resolution: { action: "add", text: "Other" },
    });
  });

  it("uses the first labelled pair when an existing label is chosen", () => {
    const flow = _flow();
    _render(flow);

    fireEvent.click(
      screen.getByRole("radio", { name: "Use an existing label" }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "7",
      resolution: { action: "map", code: "1" },
    });
  });

  it("leaves a value empty by default when a whole-number column cannot keep it", async () => {
    const flow = makeApplyFlow({
      unmatched: {
        status: "ready",
        result: new Map([
          [GENDER.id, [{ value: "X", valueKey: "x", rowCount: 2 }]],
        ]),
      },
    });
    _render({
      ...flow,
      state: {
        ...flow.state,
        picks: { [GENDER.id]: { ...SEX_PICK, direction: "encode" } },
      },
    });

    const group = screen.getByRole("radiogroup", {
      name: "What to do with X in GENDER",
    });
    expect(
      within(group).getByRole("radio", { name: "Leave empty" }),
    ).toBeChecked();
    const keep = within(group).getByRole("radio", { name: "Keep as is" });
    expect(keep).toBeDisabled();
    fireEvent.mouseEnter(keep.closest("span") ?? keep);
    expect(
      await screen.findByText(
        "This column becomes whole numbers, so this value can't stay as text.",
      ),
    ).toBeInTheDocument();
  });

  it("names a code two values add to one list, under each of their inputs", () => {
    const flow = makeApplyFlow({
      unmatched: {
        status: "ready",
        result: new Map([
          [
            GENDER.id,
            [
              { value: "X", valueKey: "x", rowCount: 2 },
              { value: "Y", valueKey: "y", rowCount: 1 },
            ],
          ],
        ]),
      },
    });
    _render({
      ...flow,
      state: {
        ...flow.state,
        picks: { [GENDER.id]: { ...SEX_PICK, direction: "encode" } },
        resolutions: {
          [GENDER.id]: {
            x: { action: "add", text: "8" },
            y: { action: "add", text: "8" },
          },
        },
      },
    });

    expect(
      screen.getByRole("textbox", { name: "Code for X" }),
    ).toHaveAccessibleDescription("The code 8 is added twice to this list.");
    expect(
      screen.getByRole("textbox", { name: "Code for Y" }),
    ).toHaveAccessibleDescription("The code 8 is added twice to this list.");
  });

  it("disables Add to list for a code already in the list without a label", async () => {
    const blankList = {
      ...SEX_LIST,
      pairs: [
        ...SEX_LIST.pairs,
        { code: "8", label: " ", acceptedSpellings: [], isMissing: false },
      ],
    };
    _render(
      _flow({
        unmatched: {
          status: "ready",
          result: new Map([
            [GENDER.id, [{ value: "8", valueKey: "8", rowCount: 4 }]],
          ]),
        },
      }),
      {
        ...makeApplyLookups(),
        codeLists: new Map([[SEX_LIST.id, blankList]]),
      },
    );

    const group = screen.getByRole("radiogroup", {
      name: "What to do with 8 in GENDER",
    });
    const add = within(group).getByRole("radio", { name: "Add to list" });
    expect(add).toBeDisabled();
    fireEvent.mouseEnter(add.closest("span") ?? add);
    expect(
      await screen.findByText(
        "8 is already in the list, without a label. Label it on the dictionary.",
      ),
    ).toBeInTheDocument();
  });

  it("disables Add to list without edit access to dictionaries", () => {
    mocks.canEditDictionaries = false;
    _render(_flow());

    for (const radio of screen.getAllByRole("radio", { name: "Add to list" })) {
      expect(radio).toBeDisabled();
    }
  });

  it("says so when nothing is unmatched, and moves on", () => {
    const flow = _flow({ unmatched: { status: "ready", result: new Map() } });
    _render(flow);

    expect(screen.getByText("Nothing is unmatched")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next: save as" }));
    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "go_to_step",
      step: "save",
    });
  });
});
