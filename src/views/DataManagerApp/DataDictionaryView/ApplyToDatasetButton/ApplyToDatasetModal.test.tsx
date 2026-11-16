import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { ApplyToDatasetModal } from "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

const { mockEditableIds } = vi.hoisted(() => {
  return { mockEditableIds: { current: [] as string[] } };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return vi.fn();
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [
          [
            { id: "ds-kings", name: "Kings line list" },
            { id: "ds-bronx", name: "Bronx line list" },
          ],
          false,
        ];
      },
      useGetEditableIds: () => {
        return [mockEditableIds.current, false];
      },
    },
  };
});

const DICTIONARY = {
  id: "dict-nys",
  name: "NYS codes",
} as unknown as DataDictionary.T;

function openDatasetSelect(): void {
  const select = screen.getByRole("combobox", { name: /Dataset/ });
  fireEvent.click(select);
}

// Mantine keeps the dropdown mounted but hidden in tests, so read every
// option rather than only the visible ones.
function getOptionNames(): string[] {
  return screen.queryAllByRole("option", { hidden: true }).map((option) => {
    return option.textContent ?? "";
  });
}

describe("ApplyToDatasetModal", () => {
  beforeEach(() => {
    mockEditableIds.current = [];
  });

  it("offers only the datasets the user can edit", async () => {
    mockEditableIds.current = ["ds-bronx"];
    render(
      <ApplyToDatasetModal dictionary={DICTIONARY} isOpen onClose={vi.fn()} />,
    );

    openDatasetSelect();

    expect(getOptionNames()).toEqual(["Bronx line list"]);
  });

  it("says so when the user can edit no dataset", async () => {
    render(
      <ApplyToDatasetModal dictionary={DICTIONARY} isOpen onClose={vi.fn()} />,
    );

    openDatasetSelect();

    expect(
      await screen.findByText("You can't edit any dataset in this workspace"),
    ).toBeInTheDocument();
  });
});
