import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { CombinedByFact } from "@/views/DataManagerApp/DatasetMetaView/CombinedByFact/CombinedByFact";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    crosswalk: undefined as unknown,
    canEditCrosswalks: true,
  };
});

vi.mock(
  "@/hooks/crosswalks/useCombiningCrosswalk/useCombiningCrosswalk",
  () => {
    return {
      useCombiningCrosswalk: () => {
        return { crosswalk: mocks.crosswalk, isLoading: false };
      },
    };
  },
);
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.canEditCrosswalks;
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
      return createElement("a", { href: "#crosswalk" }, children);
    },
  };
});

const DATASET_ID = "dataset-combined" as Dataset.Id;

describe("CombinedByFact", () => {
  beforeEach(() => {
    mocks.crosswalk = { id: "crosswalk-1", name: "Borough line lists" };
    mocks.canEditCrosswalks = true;
  });

  it("links a crosswalk editor to the crosswalk that combined the dataset", () => {
    render(<CombinedByFact datasetId={DATASET_ID} />);

    expect(screen.getByRole("term")).toHaveTextContent("Combined by");
    expect(
      screen.getByRole("link", { name: "Borough line lists" }),
    ).toBeInTheDocument();
  });

  it("names the crosswalk without a link for someone who cannot edit crosswalks", () => {
    mocks.canEditCrosswalks = false;
    render(<CombinedByFact datasetId={DATASET_ID} />);

    expect(screen.getByRole("definition")).toHaveTextContent(
      "Borough line lists",
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says nothing for a dataset no crosswalk combined", () => {
    mocks.crosswalk = undefined;
    render(<CombinedByFact datasetId={DATASET_ID} />);

    expect(screen.queryByText("Combined by")).toBeNull();
  });
});
