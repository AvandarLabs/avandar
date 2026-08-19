/**
 * The draft card is the whole point of the Case Manager flow: it must arrive
 * prefilled, and confirming it must persist exactly what the user sees, so
 * these cover the prefill, the tweak, and the resulting insert payload.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { CaseTypeDraftBlock } from "./CaseTypeDraftBlock";
import type { ChatProposedCaseType } from "$/types/chat.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const DEATHS_DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATASET_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const FIPS_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const STATE_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";
const DEATHS_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_FIPS_COLUMN_ID = "5e6f7081-aaaa-4bbb-8ccc-ddddeeeeffff";
const POPULATION_COLUMN_ID = "6f708192-aaaa-4bbb-8ccc-ddddeeeeffff";
const WORKSPACE_ID = "4d5e6f70-aaaa-4bbb-8ccc-ddddeeeeffff" as Workspace.Id;

const {
  applyCreatedCaseTypesMock,
  setPendingCaseTypeDraftMock,
  useChatPanelStateMock,
} = vi.hoisted(() => {
  return {
    applyCreatedCaseTypesMock: vi.fn().mockResolvedValue(undefined),
    setPendingCaseTypeDraftMock: vi.fn(),
    useChatPanelStateMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace");

vi.mock(
  "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager",
  () => {
    return {
      ChatPanelStateManager: {
        useState: useChatPanelStateMock,
        useDispatch: () => {
          return { setPendingCaseTypeDraft: setPendingCaseTypeDraftMock };
        },
      },
    };
  },
);

vi.mock(
  "@/views/OntologyDesignerApp/applyCreatedCaseTypes/applyCreatedCaseTypes",
  () => {
    return { applyCreatedCaseTypes: applyCreatedCaseTypesMock };
  },
);

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [
          [
            { id: FIPS_COLUMN_ID, name: "fips" },
            { id: STATE_COLUMN_ID, name: "state" },
            { id: DEATHS_COLUMN_ID, name: "deaths_total" },
            { id: CENSUS_FIPS_COLUMN_ID, name: "county_fips" },
            { id: POPULATION_COLUMN_ID, name: "population" },
          ],
        ];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [
          [
            { id: DEATHS_DATASET_ID, name: "long-us-deaths.csv" },
            { id: CENSUS_DATASET_ID, name: "county-census.csv" },
          ],
        ];
      },
    },
  };
});

function makeDraft(): ChatProposedCaseType {
  return {
    name: "County COVID record",
    description: "One county's reported deaths",
    allowManualCreation: false,
    sourceDatasets: [
      { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: FIPS_COLUMN_ID },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_FIPS_COLUMN_ID,
      },
    ],
    labelColumnId: STATE_COLUMN_ID,
    attributes: [
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: FIPS_COLUMN_ID,
        name: "County code",
        isIncluded: true,
        valuePickerRuleType: "first",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: STATE_COLUMN_ID,
        name: "State",
        isIncluded: true,
        valuePickerRuleType: "most_frequent",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: DEATHS_COLUMN_ID,
        name: "Total deaths",
        isIncluded: false,
        valuePickerRuleType: "sum",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: CENSUS_FIPS_COLUMN_ID,
        name: "Census county code",
        isIncluded: true,
        valuePickerRuleType: "first",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
        name: "Population",
        isIncluded: true,
        valuePickerRuleType: "max",
      },
    ],
    manualEntryAttributes: [{ name: "Review notes", isIncluded: false }],
  };
}

describe("CaseTypeDraftBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyCreatedCaseTypesMock.mockResolvedValue(undefined);
    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: WORKSPACE_ID,
    } as ReturnType<typeof useCurrentWorkspace>);
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: makeDraft(),
    });
  });

  it("renders nothing when no draft is pending", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: undefined,
    });
    render(<CaseTypeDraftBlock />);

    expect(screen.queryByText("Draft case type")).not.toBeInTheDocument();
  });

  it("arrives prefilled with the proposed name and description", () => {
    render(<CaseTypeDraftBlock />);

    expect(screen.getByLabelText("Name")).toHaveValue("County COVID record");
    expect(screen.getByLabelText("Description")).toHaveValue(
      "One county's reported deaths",
    );
  });

  it("shows a section per contributing dataset, not just one", () => {
    render(<CaseTypeDraftBlock />);

    expect(screen.getByText("long-us-deaths.csv")).toBeInTheDocument();
    expect(screen.getByText("county-census.csv")).toBeInTheDocument();
    expect(screen.getByText("2 datasets joined")).toBeInTheDocument();
  });

  it("shows each dataset's own join key", () => {
    render(<CaseTypeDraftBlock />);

    const joinKeys = screen
      .getAllByLabelText("Join key")
      .filter((element) => {
        return element.tagName === "INPUT";
      });
    expect(joinKeys).toHaveLength(2);
    expect(joinKeys[0]).toHaveValue("fips");
    expect(joinKeys[1]).toHaveValue("county_fips");
  });

  it("preselects the included attributes and leaves marginal ones unchecked", () => {
    render(<CaseTypeDraftBlock />);

    expect(screen.getByLabelText("Include State")).toBeChecked();
    expect(screen.getByLabelText("Include Population")).toBeChecked();
    expect(screen.getByLabelText("Include Total deaths")).not.toBeChecked();
    expect(screen.getByLabelText("Review notes")).not.toBeChecked();
  });

  it("keeps every join key locked so each dataset stays matchable", () => {
    render(<CaseTypeDraftBlock />);

    expect(screen.getByLabelText("Include County code")).toBeDisabled();
    expect(screen.getByLabelText("Include Census county code")).toBeDisabled();
  });

  it("persists columns from both datasets with a join key for each", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const caseType = call?.[0].caseTypes[0];

    expect(caseType.identities).toEqual([
      { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: FIPS_COLUMN_ID },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_FIPS_COLUMN_ID,
      },
    ]);
    expect(
      caseType.attributes.map((attribute: { name: string }) => {
        return attribute.name;
      }),
    ).toEqual(["County code", "State", "Census county code", "Population"]);
    expect(setPendingCaseTypeDraftMock).toHaveBeenCalledWith(undefined);
  });

  it("persists a column the user checked on before confirming", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByLabelText("Include Total deaths"));
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const attributeNames = call?.[0].caseTypes[0].attributes.map(
      (attribute: { name: string }) => {
        return attribute.name;
      },
    );
    expect(attributeNames).toContain("Total deaths");
  });

  it("drops a removed dataset and its columns from what is persisted", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove county-census.csv" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const caseType = call?.[0].caseTypes[0];

    expect(caseType.identities).toEqual([
      { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: FIPS_COLUMN_ID },
    ]);
    expect(
      caseType.attributes.map((attribute: { name: string }) => {
        return attribute.name;
      }),
    ).toEqual(["County code", "State"]);
  });

  it("offers no removal control when only one dataset is left", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        sourceDatasets: [
          { datasetId: DEATHS_DATASET_ID, primaryKeyColumnId: FIPS_COLUMN_ID },
        ],
        attributes: makeDraft().attributes.filter((attribute) => {
          return attribute.datasetId === DEATHS_DATASET_ID;
        }),
      },
    });
    render(<CaseTypeDraftBlock />);

    expect(
      screen.queryByRole("button", { name: /^Remove / }),
    ).not.toBeInTheDocument();
  });

  it("keeps the draft open when the insert fails", async () => {
    applyCreatedCaseTypesMock.mockRejectedValue(new Error("insert failed"));
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    expect(setPendingCaseTypeDraftMock).not.toHaveBeenCalledWith(undefined);
  });

  it("clears the draft when the user discards it", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(setPendingCaseTypeDraftMock).toHaveBeenCalledWith(undefined);
    expect(applyCreatedCaseTypesMock).not.toHaveBeenCalled();
  });
});
