import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
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
  });

  it("says when no dataset uses the dictionary", () => {
    render(<DictionaryUsedByTab usage={{ isLoading: false, rows: [] }} />);

    expect(
      screen.getByText("No datasets use this dictionary yet"),
    ).toBeInTheDocument();
  });
});
