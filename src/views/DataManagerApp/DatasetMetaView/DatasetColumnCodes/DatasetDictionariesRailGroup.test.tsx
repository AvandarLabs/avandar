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

/** A column's codes, as Task 13's `ColumnCodes.fromRows` returns them. */
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
});
