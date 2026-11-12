import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen } from "@/test-utils";
import { NewDictionaryFlowView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFlowView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";

const DATASET_ID = uuid<Dataset.Id>();

const { navigateMock, sourcesState } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    sourcesState: {
      value: undefined as unknown as NewDictionarySources,
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
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources",
  () => {
    return { useNewDictionarySources: () => sourcesState.value };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow",
  () => {
    return { useNewDictionaryFlow: () => ({}) };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepBody",
  () => {
    return { NewDictionaryStepBody: () => null };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper",
  () => {
    return { NewDictionaryStepper: () => null };
  },
);

function _setSources(options: {
  isLoading: boolean;
  datasets: Array<{ id: Dataset.Id; name: string }>;
}): void {
  sourcesState.value = {
    datasets: options.datasets,
    columnsByDatasetId: new Map(),
    isLoading: options.isLoading,
  } as unknown as NewDictionarySources;
}

describe("NewDictionaryFlowView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("titles the flow neutrally while the origin dataset loads", () => {
    _setSources({ isLoading: true, datasets: [] });
    render(<NewDictionaryFlowView originDatasetId={DATASET_ID} />);
    expect(
      screen.getByRole("heading", { name: "New dictionary" }),
    ).toBeInTheDocument();
  });

  it("names the origin dataset once it is found", () => {
    _setSources({
      isLoading: false,
      datasets: [{ id: DATASET_ID, name: "Kings line list" }],
    });
    render(<NewDictionaryFlowView originDatasetId={DATASET_ID} />);
    expect(
      screen.getByRole("heading", {
        name: "New dictionary from Kings line list",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ workspaceSlug: "demo" }),
      }),
    );
    expect(JSON.stringify(navigateMock.mock.calls[0])).toContain(DATASET_ID);
  });

  it("cancels to Data Sources when the origin dataset is not available", () => {
    _setSources({ isLoading: false, datasets: [] });
    render(<NewDictionaryFlowView originDatasetId={DATASET_ID} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(JSON.stringify(navigateMock.mock.calls[0])).not.toContain(
      DATASET_ID,
    );
  });
});
