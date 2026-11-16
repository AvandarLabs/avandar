import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DatasetDictionariesRailGroup } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

// Renders the link target into `href`, so a test can assert params
// without a router.
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params = {},
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      return createElement("a", { href: path }, children);
    },
  };
});

const DATASET = {
  id: "dataset-1" as Dataset.Id,
  name: "Kings line list",
  sourceType: "csv_file" as const,
};

const railMocks = vi.hoisted(() => {
  return { canEdit: true };
});

vi.mock("@/hooks/datasets/useCanEditDataset/useCanEditDataset", () => {
  return {
    useCanEditDataset: () => {
      return { canEdit: railMocks.canEdit, isLoading: false };
    },
  };
});
vi.mock("@/components/dataDictionaries/ReapplyButton/ReapplyButton", () => {
  return {
    ReapplyButton: (props: { dictionaryName: string }) => {
      return (
        <button type="button">{`Re-apply ${props.dictionaryName}`}</button>
      );
    },
  };
});

/** A column's codes, as `ColumnCodes.fromRows` returns them. */
function makeCodes(overrides: Partial<ColumnCodes.T> = {}): ColumnCodes.T {
  return {
    datasetColumnId: "col-gender",
    dictionaryId: "dict-nys",
    dictionaryName: "NYS codes",
    entryName: "sex",
    codeListName: "Sex (1/2/9)",
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ],
    isPinned: false,
    appliedDictionaryVersion: 1,
    currentDictionaryVersion: 1,
    isSourceDeleted: false,
    keepsOriginal: false,
    ...overrides,
  };
}

describe("DatasetDictionariesRailGroup", () => {
  it("names a dictionary once however many columns use it", () => {
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({ datasetColumnId: "col-gender", entryName: "sex" }),
      ],
      [
        "col-race",
        makeCodes({ datasetColumnId: "col-race", entryName: "race" }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    const links = screen.getAllByRole("link", { name: "NYS codes" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "/demo/data-manager/dictionaries/dict-nys",
    );
  });

  it("lists each dictionary as one row without a repeated label", () => {
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({ datasetColumnId: "col-gender", entryName: "sex" }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(screen.getByRole("term")).toHaveTextContent("NYS codes");
    expect(screen.getByRole("definition")).toHaveTextContent(
      "Attached as reference · data unchanged",
    );
    expect(screen.queryByText("Dictionary")).toBeNull();
  });

  it("renders nothing while no dictionary is attached", () => {
    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={new Map()}
        linkedDatasets={[]}
      />,
    );

    expect(screen.queryByText("Dictionaries")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says a dataset converted in place, and when its version is behind", () => {
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 3,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(
      screen.getByText("Converted this dataset · version 2"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Applied version 2, now version 3"),
    ).toBeInTheDocument();
  });

  it("links each linked dataset that reads this one", () => {
    const columnCodes = new Map([["col-gender", makeCodes()]]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[
          {
            id: "dataset-labeled" as Dataset.Id,
            name: "Kings (labeled)",
            dictionaryIds: new Set(["dict-nys"]),
          },
        ]}
      />,
    );

    expect(
      screen.getByText("Attached as reference · data unchanged"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kings (labeled)" }),
    ).toHaveAttribute("href", "/demo/data-manager/dataset-labeled");
    expect(screen.getAllByRole("definition")[1]).toHaveTextContent(
      "Linked dataset: Kings (labeled)",
    );
  });

  it("says a linked dataset's own conversions follow the dictionary", () => {
    const columnCodes = new Map([
      ["col-gender", makeCodes({ mode: "convert", direction: "encode" })],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(
      screen.getByText("Converted as it loads · follows the dictionary"),
    ).toBeInTheDocument();
  });

  it("names a deleted dictionary without a link", () => {
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          dictionaryId: "",
          dictionaryName: "",
          entryName: "",
          mode: "convert",
          direction: "encode",
          isPinned: true,
          isSourceDeleted: true,
          currentDictionaryVersion: undefined,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(screen.getByRole("term")).toHaveTextContent("A deleted dictionary");
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByText("Converted this dataset · version 1"),
    ).toBeInTheDocument();
  });

  it("offers Re-apply on a version that is behind, to an editor", () => {
    railMocks.canEdit = true;
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 3,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Re-apply NYS codes" }),
    ).toBeInTheDocument();
  });

  it("offers no Re-apply when the version is current or the user cannot edit", () => {
    railMocks.canEdit = false;
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 3,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Re-apply/ })).toBeNull();
    railMocks.canEdit = true;
  });

  it("offers no Re-apply on a pinned column whose code list was deleted", () => {
    railMocks.canEdit = true;
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          codeListName: undefined,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 3,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(
      screen.getByText("Applied version 2, now version 3"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Re-apply/ })).toBeNull();
  });

  it("offers no Re-apply when the version is current", () => {
    railMocks.canEdit = true;
    const columnCodes = new Map([
      [
        "col-gender",
        makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 3,
          currentDictionaryVersion: 3,
        }),
      ],
    ]);

    render(
      <DatasetDictionariesRailGroup
        dataset={DATASET}
        columnCodes={columnCodes}
        linkedDatasets={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Re-apply/ })).toBeNull();
  });
});
