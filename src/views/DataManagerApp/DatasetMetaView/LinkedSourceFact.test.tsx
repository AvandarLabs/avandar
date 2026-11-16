import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { LinkedSourceFact } from "@/views/DataManagerApp/DatasetMetaView/LinkedSourceFact";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { sourceDatasets: [] as unknown[] };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [mocks.sourceDatasets, false];
      },
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => {
      return createElement("a", { href: "#source" }, children);
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

const LIVE_CODES = new Map([
  ["col-gender", makeCodes({ mode: "convert", direction: "encode" })],
]);

describe("LinkedSourceFact", () => {
  beforeEach(() => {
    mocks.sourceDatasets = [{ id: "dataset-source", name: "Kings line list" }];
  });

  it("links the dataset a linked dataset reads", () => {
    render(
      <LinkedSourceFact
        linkedSourceDatasetId={"dataset-source" as Dataset.Id}
        columnCodes={LIVE_CODES}
      />,
    );

    expect(screen.getByRole("term")).toHaveTextContent("Reads");
    expect(
      screen.getByRole("link", { name: "Kings line list" }),
    ).toBeInTheDocument();
  });

  it("says the dataset it read was deleted", () => {
    render(
      <LinkedSourceFact
        linkedSourceDatasetId={undefined}
        columnCodes={LIVE_CODES}
      />,
    );

    expect(
      screen.getByText("The dataset it reads was deleted."),
    ).toBeInTheDocument();
  });

  it("says nothing for a virtual dataset that is not linked", () => {
    render(
      <LinkedSourceFact
        linkedSourceDatasetId={undefined}
        columnCodes={new Map<string, ColumnCodes.T>()}
      />,
    );

    expect(screen.queryByText("Reads")).toBeNull();
  });
});
