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
          rows: [
            {
              datasetId: "dataset-1" as Dataset.Id,
              datasetName: "Kings line list",
              entryCount: 3,
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
        usage={{ isLoading: false, hasError: false, rows: [] }}
      />,
    );

    expect(
      screen.getByText("No datasets use this dictionary yet"),
    ).toBeInTheDocument();
  });

  it("shows a loader, not the empty state, while the datasets load", () => {
    render(
      <DictionaryUsedByTab
        usage={{ isLoading: true, hasError: false, rows: [] }}
      />,
    );

    expect(
      screen.queryByText("No datasets use this dictionary yet"),
    ).not.toBeInTheDocument();
  });

  it("says the datasets failed to load instead of saying none use it", () => {
    render(
      <DictionaryUsedByTab
        usage={{ isLoading: false, hasError: true, rows: [] }}
      />,
    );

    expect(screen.getByText("Datasets failed to load")).toBeInTheDocument();
    expect(
      screen.queryByText("No datasets use this dictionary yet"),
    ).not.toBeInTheDocument();
  });
});
