import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { CombineStep } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombineStep";
import {
  CONTEXT,
  KINGS_ID,
  makeCatalog,
  makeDraft,
  makeFlow,
  QUEENS_APRIL_ID,
  QUEENS_LAYOUT_ID,
  QUEENS_MARCH_ID,
  SEX_COLUMN,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CompileCrosswalkResult } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import type { CombineAccess } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombineAccess/useCombineAccess";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

const COMBINED_ID = "55555555-5555-4555-8555-555555555555" as Dataset.Id;

const READY: CompileCrosswalkResult = {
  status: "ready",
  sql: "SELECT 1",
  columns: [
    { name: "source_dataset", dataType: "varchar" },
    { name: "case_id", dataType: "varchar" },
  ],
  bindings: [],
  compiledCodeLists: [],
  includedDatasetIds: [KINGS_ID, QUEENS_MARCH_ID],
  problems: [
    {
      kind: "columns_changed",
      datasetId: QUEENS_APRIL_ID,
      datasetName: "Queens 2026-04",
    },
    { kind: "skipped", datasetCount: 1 },
  ],
};

const mocks = vi.hoisted(() => {
  return {
    result: undefined as unknown,
    access: { status: "allowed" } as unknown,
    existingName: undefined as string | undefined,
    isExistingLoading: false,
    hasUnreadable: false as boolean | undefined,
    saveCrosswalkMock: vi.fn(),
    saveCombinedMock: vi.fn(),
    order: [] as string[],
  };
});

vi.mock("@/lib/crosswalks/compileCrosswalk/compileCrosswalk", () => {
  return {
    compileCrosswalk: () => {
      return mocks.result;
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombinedPreview/useCombinedPreview",
  () => {
    return {
      useCombinedPreview: () => {
        return {
          status: "ready",
          result: {
            rows: [{ source_dataset: "Kings line list", case_id: "K-1" }],
            rowCount: 40,
          },
        };
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombineAccess/useCombineAccess",
  () => {
    return {
      useCombineAccess: () => {
        return mocks.access;
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CombineStep/useSaveCombinedDataset/useSaveCombinedDataset",
  () => {
    return {
      useSaveCombinedDataset: () => {
        return [mocks.saveCombinedMock, false];
      },
    };
  },
);
vi.mock(
  "@/hooks/crosswalks/useHasUnreadableDatasets/useHasUnreadableDatasets",
  () => {
    return {
      useHasUnreadableDatasets: () => {
        return mocks.hasUnreadable;
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetById: () => {
        return [
          mocks.existingName ? { name: mocks.existingName } : undefined,
          mocks.isExistingLoading,
        ];
      },
    },
  };
});

function _render(
  flow: CrosswalkFlow = makeFlow(),
  crosswalk: Crosswalk.T | undefined = undefined,
): CrosswalkFlow {
  render(
    <CombineStep flow={flow} catalog={makeCatalog()} crosswalk={crosswalk} />,
  );
  return flow;
}

describe("CombineStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result = READY;
    mocks.access = { status: "allowed" } satisfies CombineAccess;
    mocks.existingName = undefined;
    mocks.isExistingLoading = false;
    mocks.hasUnreadable = false;
    mocks.order = [];
    mocks.saveCrosswalkMock.mockImplementation(() => {
      mocks.order.push("crosswalk");
      return Promise.resolve(true);
    });
    mocks.saveCombinedMock.mockImplementation(() => {
      mocks.order.push("combined");
      return Promise.resolve(undefined);
    });
  });

  it("changes how coded columns come out", () => {
    const flow = _render();

    fireEvent.click(screen.getByRole("radio", { name: "Codes" }));

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "settings_changed",
      changes: { codesOutputAs: "codes" },
      context: CONTEXT,
    });
  });

  it("changes whether the source column is added", () => {
    const flow = _render();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Add a source_dataset column" }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "settings_changed",
      changes: { addsSourceColumn: false },
      context: CONTEXT,
    });
  });

  it("refuses to add the source column while a column already has its name", () => {
    const draft = makeDraft({ addsSourceColumn: false });
    const flow = _render(
      makeFlow({
        ...draft,
        columns: draft.columns.map((column, index) => {
          return index === 0 ? { ...column, name: "Source_Dataset" } : column;
        }),
      }),
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Add a source_dataset column" }),
    );

    expect(
      screen.getByText(
        "A column is already named source_dataset. Rename it in Map each dataset first.",
      ),
    ).toBeInTheDocument();
    expect(flow.dispatch).not.toHaveBeenCalled();
  });

  it("says what is skipped and left out", () => {
    _render();

    const problems = screen.getByRole("region", { name: "Before you combine" });
    expect(
      within(problems).getByText("1 dataset is skipped."),
    ).toBeInTheDocument();
    expect(
      within(problems).getByText(
        "Queens 2026-04 was left out: its columns changed since it was mapped. Remove it and add it again to map its new columns.",
      ),
    ).toBeInTheDocument();
  });

  it("says why a dataset whose column types clash, or that can't be read, was left out", () => {
    const unreadableId = "99999999-9999-4999-8999-999999999999" as Dataset.Id;
    mocks.result = {
      ...READY,
      problems: [
        {
          kind: "column_types_differ",
          datasetId: QUEENS_APRIL_ID,
          datasetName: "Queens 2026-04",
        },
        {
          kind: "columns_changed",
          datasetId: unreadableId,
          datasetName: unreadableId,
        },
      ],
    } satisfies CompileCrosswalkResult;
    _render();

    const problems = screen.getByRole("region", { name: "Before you combine" });
    expect(
      within(problems).getByText(
        "Queens 2026-04 was left out: a column it fills from holds a different kind of values than the same column of the first dataset with its layout. Remove it, or fix that column's type at its source.",
      ),
    ).toBeInTheDocument();
    expect(
      within(problems).getByText(
        "A dataset in this crosswalk couldn't be read, so it can't be part of the combined dataset. Check that it still exists and that you can open it.",
      ),
    ).toBeInTheDocument();
    expect(problems).not.toHaveTextContent(unreadableId);
  });

  it("updates when the crosswalk row already has a combined dataset the draft does not know", () => {
    _render(makeFlow(), {
      outputDatasetId: "55555555-5555-4555-8555-555555555555",
    } as Crosswalk.T);

    expect(
      screen.getByRole("button", { name: "Update combined dataset" }),
    ).toBeInTheDocument();
  });

  it("previews the stacked rows in a labelled table with the row count", () => {
    _render();

    expect(screen.getByText("40 rows from 2 datasets")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Preview" });
    expect(
      within(table).getByRole("columnheader", { name: "source_dataset" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("cell", { name: "K-1" }),
    ).toBeInTheDocument();
  });

  it("blocks combining, without a preview, when there is nothing to combine", () => {
    mocks.result = {
      status: "blocked",
      problems: [{ kind: "nothing_to_combine" }],
    };
    _render();

    expect(
      screen.getByText(
        "There is nothing to combine yet. Map at least one dataset that isn't skipped.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Preview" })).toBeNull();
    const button = screen.getByRole("button", {
      name: "Create combined dataset",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Fix the problems above to combine.",
    );
  });

  it("says why someone who can't add datasets can't create it", () => {
    mocks.access = {
      status: "denied",
      reason: "not_admin",
    } satisfies CombineAccess;
    _render();

    expect(
      screen.getByRole("button", { name: "Create combined dataset" }),
    ).toHaveAccessibleDescription("Only workspace admins can add datasets.");
  });

  it("saves the changed crosswalk first, then creates the combined dataset under its name", async () => {
    const flow = makeFlow(makeDraft(), { save: mocks.saveCrosswalkMock });
    const dirtyFlow = {
      ...flow,
      state: {
        ...flow.state,
        draft: { ...flow.state.draft, codesOutputAs: "codes" as const },
      },
    };
    _render(dirtyFlow);

    fireEvent.click(
      screen.getByRole("button", { name: "Create combined dataset" }),
    );

    await waitFor(() => {
      expect(mocks.order).toEqual(["crosswalk", "combined"]);
    });
    expect(mocks.saveCombinedMock).toHaveBeenCalledWith({
      crosswalkId: dirtyFlow.state.draft.crosswalkId,
      outputDatasetId: undefined,
      result: READY,
      datasetName: "Measles line lists",
    });
  });

  it("updates an existing combined dataset, starting from its name", () => {
    mocks.existingName = "Measles combined";
    _render(
      makeFlow(
        makeDraft({
          outputDatasetId: "55555555-5555-4555-8555-555555555555" as Dataset.Id,
        }),
      ),
    );

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Measles combined",
    );
    expect(
      screen.getByRole("button", { name: "Update combined dataset" }),
    ).toBeEnabled();
  });

  it("does not save the combined dataset when saving the crosswalk first did not go through", async () => {
    mocks.saveCrosswalkMock.mockResolvedValue(false);
    const flow = makeFlow(makeDraft(), { save: mocks.saveCrosswalkMock });
    _render({
      ...flow,
      state: {
        ...flow.state,
        draft: { ...flow.state.draft, codesOutputAs: "codes" as const },
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create combined dataset" }),
    );

    await waitFor(() => {
      expect(mocks.saveCrosswalkMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.saveCombinedMock).not.toHaveBeenCalled();
  });

  it("names the existing combined dataset, not the typed name, when updating is refused", () => {
    mocks.existingName = "Measles combined";
    mocks.access = {
      status: "denied",
      reason: "not_dataset_editor",
    } satisfies CombineAccess;
    _render(makeFlow(makeDraft({ outputDatasetId: COMBINED_ID })));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Something else" },
    });

    expect(
      screen.getByRole("button", { name: "Update combined dataset" }),
    ).toHaveAccessibleDescription(
      "You need edit access to Measles combined to update it.",
    );
  });

  it("names the existing combined dataset when its access could not be checked", () => {
    mocks.existingName = "Measles combined";
    mocks.access = {
      status: "denied",
      reason: "failed",
    } satisfies CombineAccess;
    _render(makeFlow(makeDraft({ outputDatasetId: COMBINED_ID })));

    expect(
      screen.getByRole("button", { name: "Update combined dataset" }),
    ).toHaveAccessibleDescription(
      "Avandar couldn't check your access to Measles combined. Reload the page and try again.",
    );
  });

  it("holds the update until the existing combined dataset has been read", () => {
    mocks.isExistingLoading = true;
    _render(makeFlow(makeDraft({ outputDatasetId: COMBINED_ID })));

    expect(
      screen.getByRole("button", { name: "Update combined dataset" }),
    ).toBeDisabled();
  });

  it("won't update a combined dataset that can't be read", () => {
    _render(makeFlow(makeDraft({ outputDatasetId: COMBINED_ID })));

    const button = screen.getByRole("button", {
      name: "Update combined dataset",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Avandar couldn't check your access to the combined dataset. Reload the page and try again.",
    );
  });

  it("won't create or update while the crosswalk holds a dataset the user can't open", () => {
    mocks.hasUnreadable = true;
    const { unmount } = render(
      <CombineStep
        flow={makeFlow()}
        catalog={makeCatalog()}
        crosswalk={undefined}
      />,
    );

    const createButton = screen.getByRole("button", {
      name: "Create combined dataset",
    });
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveAccessibleDescription(
      "This crosswalk includes a dataset you can't open, so only someone who can open every dataset can create the combined dataset.",
    );
    unmount();

    mocks.existingName = "Measles combined";
    _render(makeFlow(makeDraft({ outputDatasetId: COMBINED_ID })));

    const updateButton = screen.getByRole("button", {
      name: "Update combined dataset",
    });
    expect(updateButton).toBeDisabled();
    expect(updateButton).toHaveAccessibleDescription(
      "This crosswalk includes a dataset you can't open, so only someone who can open every dataset can update the combined dataset.",
    );
  });

  it("holds the button while the unreadable-dataset lookup has no answer", () => {
    mocks.hasUnreadable = undefined;
    _render();

    expect(
      screen.getByRole("button", { name: "Create combined dataset" }),
    ).toBeDisabled();
  });

  it("lets the preview's scroll area be reached by keyboard", () => {
    _render();

    const region = screen.getByRole("region", { name: "Preview" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(
      within(region).getByRole("table", { name: "Preview" }),
    ).toBeInTheDocument();
  });

  it("says in words how much each problem matters", () => {
    mocks.result = {
      ...READY,
      problems: [
        { kind: "skipped", datasetCount: 1 },
        {
          kind: "columns_changed",
          datasetId: QUEENS_APRIL_ID,
          datasetName: "Queens 2026-04",
        },
        {
          kind: "invalid_expression",
          layoutId: QUEENS_LAYOUT_ID,
          columnId: SEX_COLUMN.id,
        },
      ],
    } satisfies CompileCrosswalkResult;
    _render();

    const items = within(
      screen.getByRole("region", { name: "Before you combine" }),
    ).getAllByRole("listitem");
    expect(
      items.map((item) => {
        return item.textContent?.split(":")[0];
      }),
    ).toEqual(["Blocks", "Changes", "Note"]);
  });

  it("goes back to Map each dataset", () => {
    const flow = _render();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(flow.goToStep).toHaveBeenCalledWith("map");
  });
});
