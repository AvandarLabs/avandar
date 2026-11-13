import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DatasetDictionariesRailGroup } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
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

/** A column bound to the NYS dictionary. */
function createCodes(
  datasetColumnId: string,
  entryName: string,
): ColumnCodes.T {
  return {
    datasetColumnId,
    dictionaryId: "dict-nys",
    dictionaryName: "NYS codes",
    entryName,
    codeListName: undefined,
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    pairs: [],
  };
}

describe("DatasetDictionariesRailGroup", () => {
  it("names a dictionary once however many columns use it", () => {
    const columnCodes = new Map([
      ["col-gender", createCodes("col-gender", "sex")],
      ["col-race", createCodes("col-race", "race")],
    ]);

    render(<DatasetDictionariesRailGroup columnCodes={columnCodes} />);

    const links = screen.getAllByRole("link", { name: "NYS codes" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "/demo/data-manager/dictionaries/dict-nys",
    );
  });

  it("lists each dictionary as one row without a repeated label", () => {
    const columnCodes = new Map([
      ["col-gender", createCodes("col-gender", "sex")],
    ]);

    render(<DatasetDictionariesRailGroup columnCodes={columnCodes} />);

    expect(screen.getByRole("term")).toHaveTextContent("NYS codes");
    expect(screen.getByRole("definition")).toHaveTextContent(
      "Attached as reference · data unchanged",
    );
    expect(screen.queryByText("Dictionary")).toBeNull();
  });

  it("renders nothing while no dictionary is attached", () => {
    render(<DatasetDictionariesRailGroup columnCodes={new Map()} />);

    expect(screen.queryByText("Dictionaries")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
