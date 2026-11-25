import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@/test-utils";
import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@avandar/ui", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    Link: (props: LinkProps) => {
      mocks.linkProps.push(props);
      return (
        <a href="#link" aria-label={props["aria-label"]}>
          {props.children}
        </a>
      );
    },
  };
});

type LinkProps = {
  children: string;
  to?: string;
  params?: unknown;
  search?: unknown;
  "aria-label"?: string;
};

const mocks = vi.hoisted(() => {
  return {
    editableIds: [] as string[],
    canEditCrosswalks: true,
    linkProps: [] as unknown[],
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetEditableIds: () => {
        return [mocks.editableIds, false];
      },
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: (permission: string) => {
      return permission === "data_sources__can_edit_crosswalks"
        ? mocks.canEditCrosswalks
        : true;
    },
  };
});
vi.mock("@/components/dataDictionaries/ReapplyButton/ReapplyButton", () => {
  return {
    ReapplyButton: (props: {
      dataset: { name: string };
      dictionaryName: string;
    }) => {
      return (
        <button type="button">
          {`Re-apply ${props.dictionaryName} to ${props.dataset.name}`}
        </button>
      );
    },
  };
});

/** Used by with one crosswalk's combined dataset in it. */
function _renderCombinedDataset(isBehind: boolean): void {
  render(
    <DictionaryUsedByTab
      usage={{
        dictionaryId: "dict-1" as DataDictionary.Id,
        dictionaryName: "NYS codes",
        isLoading: false,
        hasError: false,
        currentVersion: 3,
        rows: [
          {
            datasetId: "dataset-combined" as Dataset.Id,
            datasetName: "Measles, all boroughs",
            sourceType: "virtual",
            entryCount: 1,
            howApplied: "crosswalk",
            appliedVersion: undefined,
            isBehind,
            crosswalk: {
              id: "crosswalk-1" as Crosswalk.Id,
              name: "Borough line lists",
            },
          },
        ],
      }}
    />,
  );
}

describe("DictionaryUsedByTab", () => {
  beforeEach(() => {
    mocks.linkProps = [];
  });

  it("lists each dataset with how the dictionary was applied", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          currentVersion: 3,
          rows: [
            {
              datasetId: "dataset-1" as Dataset.Id,
              datasetName: "Kings line list",
              sourceType: "csv_file",
              entryCount: 3,
              howApplied: "reference",
              appliedVersion: undefined,
              isBehind: false,
              crosswalk: undefined,
            },
          ],
        }}
      />,
    );

    const row = screen.getByRole("row", { name: /Kings line list/ });
    expect(row).toHaveTextContent("Reference");
    expect(row).toHaveTextContent("data unchanged, always current");
    expect(row).toHaveTextContent("Up to date");
    expect(within(row).getAllByRole("cell")[2]).toHaveTextContent("3");
  });

  it("says when no dataset uses the dictionary", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          rows: [],
          currentVersion: 3,
        }}
      />,
    );

    expect(
      screen.getByText("No datasets use this dictionary yet"),
    ).toBeInTheDocument();
  });

  it("shows a loader, not the empty state, while the datasets load", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: true,
          hasError: false,
          rows: [],
          currentVersion: 3,
        }}
      />,
    );

    expect(
      screen.queryByText("No datasets use this dictionary yet"),
    ).not.toBeInTheDocument();
  });

  it("says the datasets failed to load instead of saying none use it", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: true,
          rows: [],
          currentVersion: 3,
        }}
      />,
    );

    expect(screen.getByText("Datasets failed to load")).toBeInTheDocument();
    expect(
      screen.queryByText("No datasets use this dictionary yet"),
    ).not.toBeInTheDocument();
  });

  it("says a linked dataset updates when the dictionary changes", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          currentVersion: 3,
          rows: [
            {
              datasetId: "dataset-2" as Dataset.Id,
              datasetName: "Kings line list (labeled)",
              sourceType: "virtual",
              entryCount: 1,
              howApplied: "linked",
              appliedVersion: undefined,
              isBehind: false,
              crosswalk: undefined,
            },
          ],
        }}
      />,
    );

    const row = screen.getByRole("row", {
      name: /Kings line list \(labeled\)/,
    });
    expect(row).toHaveTextContent("Linked");
    expect(row).toHaveTextContent("updates when this dictionary changes");
    expect(row).toHaveTextContent("Up to date");
  });

  it("says a dataset changed in place is behind the dictionary", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          currentVersion: 3,
          rows: [
            {
              datasetId: "dataset-3" as Dataset.Id,
              datasetName: "Bronx line list",
              sourceType: "csv_file",
              entryCount: 2,
              howApplied: "changed",
              appliedVersion: 2,
              isBehind: true,
              crosswalk: undefined,
            },
          ],
        }}
      />,
    );

    const row = screen.getByRole("row", { name: /Bronx line list/ });
    expect(row).toHaveTextContent("Changed the data");
    expect(row).toHaveTextContent("keeps the version it was given");
    expect(row).toHaveTextContent("Applied version 2, now version 3");
    expect(row).not.toHaveTextContent("Up to date");
  });

  it("offers Re-apply on a dataset behind the dictionary that the user can edit", () => {
    mocks.editableIds = ["dataset-3"];
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          currentVersion: 3,
          rows: [
            {
              datasetId: "dataset-3" as Dataset.Id,
              datasetName: "Bronx line list",
              sourceType: "csv_file",
              entryCount: 2,
              howApplied: "changed",
              appliedVersion: 2,
              isBehind: true,
              crosswalk: undefined,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Re-apply NYS codes to Bronx line list",
      }),
    ).toBeInTheDocument();
  });

  it("does not offer Re-apply to someone who cannot edit the dataset", () => {
    mocks.editableIds = [];
    render(
      <DictionaryUsedByTab
        usage={{
          dictionaryId: "dict-1" as DataDictionary.Id,
          dictionaryName: "NYS codes",
          isLoading: false,
          hasError: false,
          currentVersion: 3,
          rows: [
            {
              datasetId: "dataset-3" as Dataset.Id,
              datasetName: "Bronx line list",
              sourceType: "csv_file",
              entryCount: 2,
              howApplied: "changed",
              appliedVersion: 2,
              isBehind: true,
              crosswalk: undefined,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("row", { name: /Bronx line list/ }),
    ).toHaveTextContent("Applied version 2, now version 3");
    expect(screen.queryByRole("button", { name: /Re-apply/ })).toBeNull();
  });

  it("says a combined dataset comes through its crosswalk and is up to date", () => {
    mocks.canEditCrosswalks = true;
    _renderCombinedDataset(false);

    const row = screen.getByRole("row", { name: /Measles, all boroughs/ });
    expect(row).toHaveTextContent("Crosswalk");
    expect(row).toHaveTextContent("Through Borough line lists");
    expect(row).toHaveTextContent("Up to date");
    expect(screen.queryByRole("link", { name: /Open crosswalk/ })).toBeNull();
  });

  it("offers Open crosswalk, not Re-apply, once a code list the crosswalk embedded changed", () => {
    mocks.canEditCrosswalks = true;
    mocks.editableIds = ["dataset-combined"];
    _renderCombinedDataset(true);

    const row = screen.getByRole("row", { name: /Measles, all boroughs/ });
    expect(row).toHaveTextContent("A code list changed since it was combined");
    expect(
      screen.getByRole("link", {
        name: "Open crosswalk Borough line lists",
      }),
    ).toBeInTheDocument();
    expect(mocks.linkProps).toContainEqual(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/crosswalks/$crosswalkId",
        params: { workspaceSlug: "demo", crosswalkId: "crosswalk-1" },
        search: { step: "combine", layoutId: undefined },
        "aria-label": "Open crosswalk Borough line lists",
      }),
    );
    expect(screen.queryByRole("button", { name: /Re-apply/ })).toBeNull();
  });

  it("does not offer Open crosswalk to someone who cannot edit crosswalks", () => {
    mocks.canEditCrosswalks = false;
    _renderCombinedDataset(true);

    expect(
      screen.getByRole("row", { name: /Measles, all boroughs/ }),
    ).toHaveTextContent("A code list changed since it was combined");
    expect(screen.queryByRole("link", { name: /Open crosswalk/ })).toBeNull();
  });
});
