import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import {
  BRONX,
  KINGS_APRIL,
  KINGS_MARCH,
  makeCrosswalkCatalog,
  makeCrosswalkFlow,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  BRONX_LAYOUT,
  KINGS_LAYOUT,
  KINGS_LAYOUT_ID,
  makeEmptyDraft,
  makeLayoutsDraft,
  makeMappedDraft,
  makeStateFromDraft,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import { ChooseDatasetsStep } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ChooseDatasetsStep";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

const mocks = vi.hoisted(() => {
  return { datasetsMock: vi.fn() };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { useGetAll: mocks.datasetsMock } };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

function _renderStep(draft: CrosswalkDraft.T): CrosswalkFlow {
  const flow = makeCrosswalkFlow({ state: makeStateFromDraft(draft) });
  render(
    <ChooseDatasetsStep
      flow={flow}
      catalog={makeCrosswalkCatalog()}
      crosswalk={undefined}
    />,
  );
  return flow;
}

/**
 * The layouts table's row that names `datasetName`. The Select's options
 * stay mounted in a portal, so the row is looked up inside the table.
 */
function _layoutRow(datasetName: string): ReturnType<typeof within> {
  const row = within(screen.getByRole("table"))
    .getByText(datasetName)
    .closest("tr");
  if (!row) {
    throw new Error(`No layout row names ${datasetName}`);
  }
  return within(row);
}

describe("ChooseDatasetsStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.datasetsMock.mockReturnValue([[], false, {}]);
  });

  it("asks for datasets when there are none, and cannot move on", () => {
    _renderStep(makeEmptyDraft());

    expect(
      screen.getByText("Add the datasets to combine."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Datasets with the same columns are mapped once, together.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add datasets" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("lists each layout with its name, datasets, columns, and the reference tag", () => {
    _renderStep(makeLayoutsDraft());

    const bronx = _layoutRow(BRONX.name);
    expect(bronx.getByText("Reference")).toBeInTheDocument();
    expect(
      bronx.getByRole("button", { name: "1 dataset" }),
    ).toBeInTheDocument();
    expect(bronx.getByText("3")).toBeInTheDocument();
    const kings = _layoutRow(KINGS_MARCH.name);
    expect(kings.getByText("+1 with the same layout")).toBeInTheDocument();
    expect(kings.queryByText("Reference")).not.toBeInTheDocument();
    expect(kings.getByRole("button", { name: "2 datasets" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(kings.getByText("4")).toBeInTheDocument();
  });

  it("opens a layout's datasets and removes one", () => {
    const flow = _renderStep(makeLayoutsDraft());

    const toggle = screen.getByRole("button", { name: "2 datasets" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${KINGS_APRIL.name}` }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "dataset_removed",
      datasetId: KINGS_APRIL.id,
    });
  });

  it("says how well the reference covers the other datasets, and changes it", () => {
    const flow = _renderStep(makeLayoutsDraft());

    expect(
      screen.getByText(/^Matches \d+% of the columns in the other datasets\.$/),
    ).toBeInTheDocument();
    pickMantineSelectOption("Reference layout", KINGS_MARCH.name);

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "reference_chosen",
      layoutId: KINGS_LAYOUT_ID,
    });
  });

  it("locks the reference once another layout is mapped, and says why", () => {
    _renderStep(
      makeMappedDraft({
        layouts: [BRONX_LAYOUT, { ...KINGS_LAYOUT, status: "mapped" }],
      }),
    );

    expect(
      screen.getByRole("combobox", { name: "Reference layout" }),
    ).toHaveAttribute("readonly");
    expect(
      screen.getByText(
        "You confirmed mappings against this layout, so the reference can't change.",
      ),
    ).toBeInTheDocument();
  });

  it("seeds the columns and saves on Next, then opens the first layout to map", async () => {
    const flow = _renderStep(makeLayoutsDraft({ isSaved: false }));

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(flow.goToStep).toHaveBeenCalledWith("map", KINGS_LAYOUT_ID);
    });
    expect(flow.dispatchAndSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: "columns_seeded" }),
    );
  });

  it("moves on to mapping when the columns are already seeded", async () => {
    const flow = _renderStep(makeMappedDraft());

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(flow.goToStep).toHaveBeenCalledWith("map", KINGS_LAYOUT_ID);
    });
    expect(flow.dispatchAndSave).not.toHaveBeenCalled();
  });

  it("opens Add datasets", async () => {
    _renderStep(makeLayoutsDraft());

    fireEvent.click(screen.getByRole("button", { name: "Add datasets" }));

    expect(
      await screen.findByRole("dialog", { name: "Add datasets" }),
    ).toBeInTheDocument();
  });
});
