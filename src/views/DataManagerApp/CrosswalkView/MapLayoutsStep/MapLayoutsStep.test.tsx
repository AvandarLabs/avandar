import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import {
  BRONX_LAYOUT_ID,
  GENDER_FILL,
  makeCatalog,
  makeDraft,
  makeFlow,
  ONSET_COLUMN,
  QUEENS_DATE_FORMATS,
  QUEENS_LAYOUT_ID,
  QUEENS_PROFILES,
  REFERENCE_LAYOUT_ID,
  SEX_COLUMN,
  withFill,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { MapLayoutsStep } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsStep";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

const mocks = vi.hoisted(() => {
  return {
    suggestMatchesMock: vi.fn(),
    valuesStatus: "ready" as "reading" | "ready" | "failed",
  };
});

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches",
  () => {
    return {
      useCrosswalkSuggestionConsent: () => {
        return { consent: "not_asked", onConsentDecided: vi.fn() };
      },
      useCrosswalkMeaningMatches: () => {
        return {
          availability: "online",
          canSuggest: true,
          status: "idle",
          foundCount: undefined,
          suggestMatches: mocks.suggestMatchesMock,
        };
      },
    };
  },
);

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues",
  () => {
    return {
      useLayoutValues: () => {
        return {
          status: mocks.valuesStatus,
          profilesBySourceColumn: QUEENS_PROFILES,
          dateFormatsBySourceColumn: QUEENS_DATE_FORMATS,
          targets: [],
        };
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub",
  () => {
    return {
      LayoutStub: (props: {
        selectedLayoutId: string | undefined;
        onSelectLayout: (layoutId: string) => void;
      }) => {
        return (
          <button
            type="button"
            data-selected={props.selectedLayoutId}
            onClick={() => {
              props.onSelectLayout("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
            }}
          >
            stub
          </button>
        );
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable",
  () => {
    return {
      MappingTable: (props: {
        layoutId: string;
        onSelectColumn: (columnId: string) => void;
      }) => {
        return (
          <button
            type="button"
            data-layout={props.layoutId}
            onClick={() => {
              props.onSelectColumn("c0000000-0000-4000-8000-000000000003");
            }}
          >
            table
          </button>
        );
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane",
  () => {
    return {
      MappingPane: (props: { column: { name: string } }) => {
        return <p>pane for {props.column.name}</p>;
      },
    };
  },
);

function _render(flow: CrosswalkFlow = makeFlow()): CrosswalkFlow {
  render(
    <MapLayoutsStep
      flow={flow}
      catalog={makeCatalog()}
      crosswalk={undefined}
    />,
  );
  return flow;
}

function _withStatus(
  layoutId: string,
  status: CrosswalkDraft.Layout["status"],
): CrosswalkDraft.T {
  const draft = makeDraft();
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return layout.id === layoutId ? { ...layout, status } : layout;
    }),
  };
}

describe("MapLayoutsStep", () => {
  beforeEach(() => {
    mocks.valuesStatus = "ready";
    mocks.suggestMatchesMock.mockReset();
  });

  it("shows the first layout to map, named by its first dataset, with the column needing attention", () => {
    _render();

    expect(
      screen.getByRole("heading", { name: "Queens 2026-03" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+1 with the same layout")).toBeInTheDocument();
    expect(screen.getByText("pane for sex")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "stub" })).toHaveAttribute(
      "data-selected",
      QUEENS_LAYOUT_ID,
    );
    expect(screen.getByRole("button", { name: "table" })).toHaveAttribute(
      "data-layout",
      QUEENS_LAYOUT_ID,
    );
  });

  it("says while the layout's values are read", () => {
    mocks.valuesStatus = "reading";
    _render();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading the values of Queens 2026-03 on this device",
    );
  });

  it("shows the column picked in the table", () => {
    _render();

    fireEvent.click(screen.getByRole("button", { name: "table" }));

    expect(
      screen.getByText(`pane for ${ONSET_COLUMN.name}`),
    ).toBeInTheDocument();
  });

  it("keeps the fallback column once the chosen one is removed", () => {
    const draft = makeDraft();
    const { rerender } = render(
      <MapLayoutsStep
        flow={makeFlow(draft)}
        catalog={makeCatalog()}
        crosswalk={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "table" }));
    expect(
      screen.getByText(`pane for ${ONSET_COLUMN.name}`),
    ).toBeInTheDocument();
    const rerenderWith = (next: CrosswalkDraft.T): void => {
      rerender(
        <MapLayoutsStep
          flow={makeFlow(next)}
          catalog={makeCatalog()}
          crosswalk={undefined}
        />,
      );
    };

    const withoutOnset = {
      ...draft,
      columns: draft.columns.filter((column) => {
        return column.id !== ONSET_COLUMN.id;
      }),
    };
    rerenderWith(withoutOnset);
    expect(screen.getByText("pane for sex")).toBeInTheDocument();

    // Confirming sex leaves nothing to attend to. A selection that was not
    // written back would now jump to the first column.
    rerenderWith(
      withFill(withoutOnset, {
        layoutId: QUEENS_LAYOUT_ID,
        columnId: SEX_COLUMN.id,
        fill: GENDER_FILL,
      }),
    );
    expect(screen.getByText("pane for sex")).toBeInTheDocument();
  });

  it("selects the layout picked in the stub through the flow, which saves first", () => {
    const flow = _render();

    fireEvent.click(screen.getByRole("button", { name: "stub" }));

    expect(flow.selectLayout).toHaveBeenCalledWith(BRONX_LAYOUT_ID);
    expect(flow.save).not.toHaveBeenCalled();
  });

  it("confirms the layout and moves to the next one to map", async () => {
    const flow = _render();

    fireEvent.click(screen.getByRole("button", { name: "Confirm and next" }));

    await waitFor(() => {
      expect(flow.selectLayout).toHaveBeenCalledWith(BRONX_LAYOUT_ID);
    });
    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "layout_confirmed",
      layoutId: QUEENS_LAYOUT_ID,
    });
  });

  it("offers Accept all suggestions only while one is left", () => {
    _render(makeFlow(makeDraft(), { layoutId: BRONX_LAYOUT_ID }));

    expect(
      screen.getByRole("button", { name: "Accept all suggestions" }),
    ).toBeDisabled();
  });

  it("offers Map this dataset, and nothing else, for a skipped layout", () => {
    const flow = _render(
      makeFlow(_withStatus(BRONX_LAYOUT_ID, "skipped"), {
        layoutId: BRONX_LAYOUT_ID,
      }),
    );

    expect(
      screen.queryByRole("button", { name: "Confirm and next" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Map this dataset" }));

    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "layout_reopened",
      layoutId: BRONX_LAYOUT_ID,
    });
  });

  it("never offers to skip the reference layout", () => {
    _render(makeFlow(makeDraft(), { layoutId: REFERENCE_LAYOUT_ID }));

    expect(
      screen.getByRole("heading", { name: "Kings line list" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Skip this dataset" }),
    ).toBeNull();
  });

  it("adds a column, refusing a name already used and the source column's name", async () => {
    const flow = _render();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Add a column to the combined dataset",
      }),
    );
    // Mantine keeps the dropdown display:none under happy-dom, so `hidden`.
    const form = (
      await screen.findByRole("textbox", { name: "Column name", hidden: true })
    ).closest("form")!;
    const nameInput = within(form).getByRole("textbox", {
      name: "Column name",
      hidden: true,
    });
    fireEvent.change(nameInput, { target: { value: "Case_ID" } });
    expect(
      within(form).getByText(
        "Case_ID is already a column of the combined dataset.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: "source_dataset" } });
    expect(
      within(form).getByText(
        "source_dataset is the column that names each row's dataset. Choose another name.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: "county" } });
    fireEvent.click(
      within(form).getByRole("button", { name: "Add column", hidden: true }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "column_added",
      columnId: expect.any(String),
      name: "county",
      dataType: "varchar",
    });
  });

  it("asks for matches by meaning from the footer", () => {
    _render();

    fireEvent.click(screen.getByRole("button", { name: "Suggest matches" }));

    expect(mocks.suggestMatchesMock).toHaveBeenCalledTimes(1);
  });

  it("offers no Suggest matches for a skipped layout", () => {
    _render(
      makeFlow(_withStatus(BRONX_LAYOUT_ID, "skipped"), {
        layoutId: BRONX_LAYOUT_ID,
      }),
    );

    expect(
      screen.queryByRole("button", { name: "Suggest matches" }),
    ).toBeNull();
  });
});
