import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  BRONX,
  CONTEXT,
  KINGS_APRIL,
  KINGS_MARCH,
  QUEENS,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  makeLayoutsDraft,
  toDatasetRecord,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import { AddDatasetsModal } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/AddDatasetsModal/AddDatasetsModal";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return { useGetAllMock: vi.fn() };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { useGetAll: mocks.useGetAllMock } };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

/** A dataset the catalog knows that has no columns yet. */
const NO_COLUMNS: CrosswalkLayout.Dataset = {
  id: "00000000-0000-4000-8000-0000000000dd" as Dataset.Id,
  name: "Richmond cases",
  columns: [],
};
const COMBINED = toDatasetRecord({
  id: "00000000-0000-4000-8000-0000000000ee" as Dataset.Id,
  name: "Measles combined",
  columns: [],
});
const UNREADABLE = toDatasetRecord({
  id: "00000000-0000-4000-8000-0000000000ff" as Dataset.Id,
  name: "Not in the catalog",
  columns: [],
});
const MODAL_CONTEXT = {
  ...CONTEXT,
  datasetsById: new Map([...CONTEXT.datasetsById, [NO_COLUMNS.id, NO_COLUMNS]]),
};

function _renderModal(
  draft = makeLayoutsDraft({ outputDatasetId: COMBINED.id }),
) {
  const onAdd = vi.fn();
  const onClose = vi.fn();
  render(
    <AddDatasetsModal
      isOpen
      draft={draft}
      context={MODAL_CONTEXT}
      isCatalogLoading={false}
      onAdd={onAdd}
      onClose={onClose}
    />,
  );
  return { onAdd, onClose };
}

describe("AddDatasetsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGetAllMock.mockReturnValue([
      [KINGS_MARCH, KINGS_APRIL, BRONX, QUEENS, NO_COLUMNS]
        .map(toDatasetRecord)
        .concat([COMBINED, UNREADABLE]),
      false,
      {},
    ]);
  });

  it("shows the datasets already in the crosswalk picked and locked", () => {
    _renderModal();

    const kings = screen.getByRole("checkbox", {
      name: "Pick Kings line list 2026-03",
    });
    expect(kings).toBeChecked();
    expect(kings).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Pick Queens cases" }),
    ).not.toBeChecked();
  });

  it("never offers the crosswalk's own combined dataset or one it cannot read", () => {
    _renderModal();

    expect(screen.queryByText("Measles combined")).not.toBeInTheDocument();
    expect(screen.queryByText("Not in the catalog")).not.toBeInTheDocument();
  });

  it("shows a dataset with no columns disabled, and says why", () => {
    const { onAdd } = _renderModal();

    const richmond = screen.getByRole("checkbox", {
      name: "Pick Richmond cases",
    });
    expect(richmond).toBeDisabled();
    expect(richmond).not.toBeChecked();
    expect(richmond).toHaveAccessibleDescription(
      "This dataset has no columns yet.",
    );
    fireEvent.click(screen.getByText("Richmond cases"));
    expect(
      screen.getByRole("button", { name: "Add 0 datasets" }),
    ).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("adds only the newly picked datasets", () => {
    const { onAdd } = _renderModal();
    expect(
      screen.getByRole("button", { name: "Add 0 datasets" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pick Queens cases" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add 1 dataset" }));

    expect(onAdd).toHaveBeenCalledWith([QUEENS.id]);
  });
});
