import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@/test-utils";
import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
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
    Link: (props: { children: string }) => {
      return <a href="#dataset">{props.children}</a>;
    },
  };
});

describe("DictionaryUsedByTab", () => {
  it("lists each dataset with how the dictionary was applied", () => {
    render(
      <DictionaryUsedByTab
        usage={{
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
});
