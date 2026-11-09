/**
 * The draft card is the whole point of the Case Manager flow: it must arrive
 * prefilled, and confirming it must persist exactly what the user sees, so
 * these cover the prefill, the tweak, and the resulting insert payload.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  fireEvent,
  makeHasPermissionFromAppRoles,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import { CaseTypeDraftBlock } from "./CaseTypeDraftBlock";
import type { PermissionKey } from "$/models/Permissions/Permissions";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatProposedCaseType } from "$/types/chat.types";

const DEATHS_DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATASET_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const FIPS_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const STATE_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";
const DEATHS_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_FIPS_COLUMN_ID = "5e6f7081-aaaa-4bbb-8ccc-ddddeeeeffff";
const POPULATION_COLUMN_ID = "6f708192-aaaa-4bbb-8ccc-ddddeeeeffff";
const UNLISTED_COLUMN_ID = "7a8b9cad-aaaa-4bbb-8ccc-ddddeeeeffff";
const REPORT_DATE_COLUMN_ID = "7a8b9c0d-aaaa-4bbb-8ccc-ddddeeeeffff";
const HOSPITAL_DATASET_ID = "8a9b0cad-cccc-4bbb-8ccc-ddddeeeeffff";
const BEDS_COLUMN_ID = "9b0cad12-cccc-4bbb-8ccc-ddddeeeeffff";
const CONFIRMED_COLUMN_ID = "0cad1234-cccc-4bbb-8ccc-ddddeeeeffff";
const WORKSPACE_ID = "4d5e6f70-aaaa-4bbb-8ccc-ddddeeeeffff" as Workspace.Id;

const {
  applyCreatedCaseTypesMock,
  hasPermissionMock,
  setPendingCaseTypeDraftMock,
  useChatPanelStateMock,
} = vi.hoisted(() => {
  return {
    applyCreatedCaseTypesMock: vi.fn().mockResolvedValue(undefined),
    hasPermissionMock: vi.fn<(permissionKey: PermissionKey) => boolean>(),
    setPendingCaseTypeDraftMock: vi.fn(),
    useChatPanelStateMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace");

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return { useHasPermission: hasPermissionMock };
});

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

// Creating a case type shows a toast, and every Mantine toast mounted here
// leaves a 4s auto-close timer that unmounting cannot clear. When that timer
// outlives the file it fires after jsdom is torn down and fails the whole run
// with "window is not defined", so no real toast is mounted.
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
  };
});

const CATALOG_DATASETS = [
  {
    id: DEATHS_DATASET_ID,
    name: "long-us-deaths.csv",
    columns: [
      {
        id: FIPS_COLUMN_ID,
        name: "fips",
        datasetId: DEATHS_DATASET_ID,
        dataType: "varchar",
      },
      {
        id: STATE_COLUMN_ID,
        name: "state",
        datasetId: DEATHS_DATASET_ID,
        dataType: "varchar",
      },
      {
        id: DEATHS_COLUMN_ID,
        name: "deaths_total",
        datasetId: DEATHS_DATASET_ID,
        dataType: "bigint",
      },
      {
        id: CONFIRMED_COLUMN_ID,
        name: "confirmed_cases",
        datasetId: DEATHS_DATASET_ID,
        dataType: "bigint",
      },
      {
        id: REPORT_DATE_COLUMN_ID,
        name: "report_date",
        datasetId: DEATHS_DATASET_ID,
        dataType: "date",
      },
    ],
  },
  {
    id: CENSUS_DATASET_ID,
    name: "county-census.csv",
    columns: [
      {
        id: CENSUS_FIPS_COLUMN_ID,
        name: "county_fips",
        datasetId: CENSUS_DATASET_ID,
        dataType: "varchar",
      },
      {
        id: POPULATION_COLUMN_ID,
        name: "population",
        datasetId: CENSUS_DATASET_ID,
        dataType: "bigint",
      },
    ],
  },
  {
    id: HOSPITAL_DATASET_ID,
    name: "hospitals.csv",
    columns: [
      {
        id: BEDS_COLUMN_ID,
        name: "beds",
        datasetId: HOSPITAL_DATASET_ID,
        dataType: "bigint",
      },
    ],
  },
];

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        const columns = CATALOG_DATASETS.flatMap((dataset) => {
          return dataset.columns;
        });
        return [columns];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [
          CATALOG_DATASETS.map((dataset) => {
            return { id: dataset.id, name: dataset.name };
          }),
        ];
      },
      useGetAllDatasetsWithColumns: () => {
        return [CATALOG_DATASETS];
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
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: STATE_COLUMN_ID,
        name: "State",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "most_frequent",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: DEATHS_COLUMN_ID,
        name: "Total deaths",
        isIncluded: false,
        valueShape: "single",
        valuePickerRuleType: "sum",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: CENSUS_FIPS_COLUMN_ID,
        name: "Census county code",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
        name: "Population",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "max",
      },
    ],
    manualEntryAttributes: [{ name: "Review notes", isIncluded: false }],
  };
}

/** The input of a row's "Value to keep" select, not its dropdown list. */
function _getRuleInput(fieldName: string): HTMLElement {
  const input = screen
    .getAllByLabelText(`Value to keep for ${fieldName}`)
    .find((element) => {
      return element.tagName === "INPUT";
    });
  if (!input) {
    throw new Error(`No value to keep select for ${fieldName}`);
  }
  return input;
}

/** The One value / Every value control of a field's row. */
function _getValueShapeControl(fieldName: string): HTMLElement {
  return screen.getByRole("radiogroup", {
    name: `How many values ${fieldName} keeps`,
  });
}

/** The option labels a row's value rule select offers, in order. */
function _offeredRules(selectLabel: string): string[] {
  return within(getMantineSelectDropdown(selectLabel))
    .queryAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}

describe("CaseTypeDraftBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyCreatedCaseTypesMock.mockResolvedValue(undefined);
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "editor" }),
    );
    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: WORKSPACE_ID,
    } as ReturnType<typeof useCurrentWorkspace>);
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: makeDraft(),
    });
  });

  it("persists a field switched to every value as a list without a value rule", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(
      within(_getValueShapeControl("Population")).getByRole("radio", {
        name: "Every value",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const population = call?.[0].caseTypes[0].attributes.find(
      (attribute: { name: string }) => {
        return attribute.name === "Population";
      },
    );
    expect(population).toMatchObject({ valueShape: "list" });
    expect(population).not.toHaveProperty("valuePickerRuleType");
  });

  it("hides the value picker of a field that keeps every value", () => {
    render(<CaseTypeDraftBlock />);
    expect(
      screen.queryAllByLabelText("Value to keep for Population"),
    ).not.toHaveLength(0);

    fireEvent.click(
      within(_getValueShapeControl("Population")).getByRole("radio", {
        name: "Every value",
      }),
    );

    expect(
      screen.queryAllByLabelText("Value to keep for Population"),
    ).toHaveLength(0);
  });

  it("locks the label and each join key to one value", () => {
    render(<CaseTypeDraftBlock />);

    for (const fieldName of ["State", "County code", "Census county code"]) {
      expect(
        within(_getValueShapeControl(fieldName)).getByRole("radio", {
          name: "Every value",
        }),
      ).toBeDisabled();
    }
  });

  it("says why the label and each join key keep one value", () => {
    render(<CaseTypeDraftBlock />);

    for (const fieldName of ["State", "County code", "Census county code"]) {
      expect(_getValueShapeControl(fieldName)).toHaveAccessibleDescription(
        "Join keys and the label keep one value.",
      );
    }
  });

  it("gives a field that can keep every value no note", () => {
    render(<CaseTypeDraftBlock />);

    expect(
      _getValueShapeControl("Population"),
    ).not.toHaveAccessibleDescription();
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

    expect(
      screen.getByRole("combobox", { name: "Dataset long-us-deaths.csv" }),
    ).toHaveValue("long-us-deaths.csv");
    expect(
      screen.getByRole("combobox", { name: "Dataset county-census.csv" }),
    ).toHaveValue("county-census.csv");
    expect(screen.getByText("2 datasets joined")).toBeInTheDocument();
  });

  it("shows each dataset's own join key", () => {
    render(<CaseTypeDraftBlock />);

    const joinKeys = screen.getAllByLabelText("Join key").filter((element) => {
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

  it("removes the only dataset and then lets the user choose another", () => {
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

    fireEvent.click(
      screen.getByRole("button", { name: "Remove long-us-deaths.csv" }),
    );

    expect(screen.getByText("No datasets")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Dataset" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create case type" }),
    ).toBeDisabled();

    pickMantineSelectOption("Dataset", "hospitals.csv");
    expect(
      screen.getByRole("combobox", { name: "Dataset hospitals.csv" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create case type" }),
    ).toBeDisabled();

    pickMantineSelectOption("Add a field from hospitals.csv", "beds");
    expect(
      screen.getByRole("button", { name: "Create case type" }),
    ).toBeEnabled();
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

  it("hides Create case type from a case_types viewer", () => {
    hasPermissionMock.mockImplementation(
      makeHasPermissionFromAppRoles({ case_types: "viewer" }),
    );
    render(<CaseTypeDraftBlock />);

    expect(
      screen.queryByRole("button", { name: "Create case type" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("lists the proposed statuses with what each one means", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        statuses: [
          {
            name: "Suspected",
            description: "Reported but not yet tested.",
            color: "#fab005",
          },
          {
            name: "Confirmed",
            description: "A lab test came back positive.",
            color: "#fa5252",
          },
        ],
        defaultStatusName: "Suspected",
      },
    });
    render(<CaseTypeDraftBlock />);

    const list = screen.getByRole("list", { name: "Proposed statuses" });
    expect(list).toHaveTextContent("Suspected");
    expect(list).toHaveTextContent("A lab test came back positive.");
  });

  it("lists the default statuses when the proposal has none", () => {
    render(<CaseTypeDraftBlock />);

    const list = screen.getByRole("list", { name: "Proposed statuses" });
    expect(list).toHaveTextContent("Active");
    expect(list).toHaveTextContent("Inactive");
  });

  it("swaps the list for the status editor on Edit statuses", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Edit statuses" }));

    expect(
      screen.queryByRole("list", { name: "Proposed statuses" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Default status" }),
    ).toBeInTheDocument();
  });

  it("persists the proposed statuses and default when created", async () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      },
    });
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const caseType = applyCreatedCaseTypesMock.mock.calls[0]?.[0].caseTypes[0];
    expect(
      caseType.statuses.map((status: { name: string }) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(caseType.defaultStatusName).toBe("Confirmed");
  });

  it("flags an attribute renamed to status and blocks creation", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.change(screen.getByLabelText("Name for state"), {
      target: { value: "Status" },
    });

    expect(
      screen.getByText(
        "Every case type already has a status. Choose another name.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create case type" }),
    ).toBeDisabled();
  });

  it("flags a hand-filled field named status and offers no add", () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.change(screen.getByLabelText("Add a field filled in by hand"), {
      target: { value: "status" },
    });

    expect(
      screen.getByText(
        "Every case type already has a status. Choose another name.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add field" })).toBeDisabled();
  });

  // Creation saves `most_frequent` for every join key, so the row shows that
  // rule rather than the one chat proposed ("first" in this draft).
  it("shows each join key keeping its value as is, whatever rule chat proposed", () => {
    render(<CaseTypeDraftBlock />);

    for (const fieldName of ["County code", "Census county code"]) {
      const ruleInput = _getRuleInput(fieldName);
      expect(ruleInput).toHaveValue("Most frequent");
      expect(ruleInput).toBeDisabled();
      expect(ruleInput).toHaveAccessibleDescription(
        "ID fields keep their value as is.",
      );
    }
  });

  it("leaves the value to keep editable on a field that is not a join key", () => {
    render(<CaseTypeDraftBlock />);

    const ruleInput = _getRuleInput("Population");
    expect(ruleInput).toBeEnabled();
    expect(ruleInput).toHaveValue("Max");
  });

  it("moves the lock to the new join key when the user changes it", () => {
    render(<CaseTypeDraftBlock />);

    const deathsJoinKey = screen.getAllByRole("combobox", {
      name: "Join key",
    })[0]!;
    const dropdown = document.querySelectorAll<HTMLElement>(
      ".mantine-Select-dropdown",
    )[screen.getAllByRole("combobox").indexOf(deathsJoinKey)]!;
    fireEvent.click(deathsJoinKey);
    fireEvent.click(
      within(dropdown).getByRole("option", { name: "state", hidden: true }),
    );

    expect(_getRuleInput("State")).toBeDisabled();
    expect(_getRuleInput("State")).toHaveValue("Most frequent");
    expect(_getRuleInput("County code")).toBeEnabled();
    expect(_getRuleInput("County code")).toHaveValue("First");
    expect(_getRuleInput("County code")).not.toHaveAccessibleDescription();
    expect(_getRuleInput("Census county code")).toBeDisabled();
  });

  it("offers neither sum nor average for a text column", () => {
    render(<CaseTypeDraftBlock />);

    expect(_offeredRules("Value to keep for State")).toEqual([
      "Most frequent",
      "First",
      "Count",
      "Alphabetically last",
      "Alphabetically first",
    ]);
  });

  it("names max and min alphabetically for a text column", () => {
    render(<CaseTypeDraftBlock />);

    const offeredRules = _offeredRules("Value to keep for State");
    expect(offeredRules).toContain("Alphabetically last");
    expect(offeredRules).toContain("Alphabetically first");
    expect(offeredRules).not.toContain("Max");
    expect(offeredRules).not.toContain("Min");
  });

  it("offers every rule for a whole-number column", () => {
    render(<CaseTypeDraftBlock />);

    expect(_offeredRules("Value to keep for Total deaths")).toEqual([
      "Most frequent",
      "First",
      "Sum",
      "Average",
      "Count",
      "Max",
      "Min",
    ]);
  });

  it("shows the rule that will be saved when the proposed one does not fit the column", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        attributes: makeDraft().attributes.map((attribute) => {
          return attribute.columnId === STATE_COLUMN_ID
            ? { ...attribute, valuePickerRuleType: "sum" as const }
            : attribute;
        }),
      },
    });
    render(<CaseTypeDraftBlock />);

    expect(
      screen.getByRole("combobox", { name: "Value to keep for State" }),
    ).toHaveValue("Most frequent");
  });

  it("offers every rule while a column's type is unknown", () => {
    useChatPanelStateMock.mockReturnValue({
      pendingCaseTypeDraft: {
        ...makeDraft(),
        attributes: makeDraft().attributes.map((attribute) => {
          return attribute.columnId === STATE_COLUMN_ID
            ? { ...attribute, columnId: UNLISTED_COLUMN_ID }
            : attribute;
        }),
      },
    });
    render(<CaseTypeDraftBlock />);

    expect(_offeredRules("Value to keep for State")).toEqual([
      "Most frequent",
      "First",
      "Sum",
      "Average",
      "Count",
      "Max",
      "Min",
    ]);
  });

  it("creates a per-month field with its dataset's first date column", async () => {
    render(<CaseTypeDraftBlock />);

    fireEvent.click(screen.getByLabelText("Include Total deaths"));
    fireEvent.click(
      within(_getValueShapeControl("Total deaths")).getByRole("radio", {
        name: "Per period",
      }),
    );
    const dateColumnInput = screen
      .getAllByLabelText("Date column for Total deaths")
      .find((element) => {
        return element.tagName === "INPUT";
      });
    expect(dateColumnInput).toHaveValue("report_date");
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const totalDeaths = call?.[0].caseTypes[0].attributes.find(
      (attribute: { name: string }) => {
        return attribute.name === "Total deaths";
      },
    );
    expect(totalDeaths).toMatchObject({
      valueShape: "bucketed_list",
      valuePickerRuleType: "sum",
      bucketGrain: "month",
      bucketColumnId: REPORT_DATE_COLUMN_ID,
    });
  });

  it("does not offer a dataset another section already uses", () => {
    render(<CaseTypeDraftBlock />);

    const optionLabels = within(
      getMantineSelectDropdown("Dataset long-us-deaths.csv"),
    )
      .getAllByRole("option", { hidden: true })
      .map((option) => {
        return option.textContent;
      });

    expect(optionLabels).toEqual(["long-us-deaths.csv", "hospitals.csv"]);
  });

  it("changes a drafted dataset and drops the fields that came from it", () => {
    render(<CaseTypeDraftBlock />);

    pickMantineSelectOption("Dataset long-us-deaths.csv", "hospitals.csv");

    expect(
      screen.queryByLabelText("Include County code"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Include State")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Dataset hospitals.csv" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 datasets joined")).toBeInTheDocument();
  });

  it("persists a joined dataset and column the draft did not include", async () => {
    render(<CaseTypeDraftBlock />);

    pickMantineSelectOption("Add a dataset", "hospitals.csv");
    pickMantineSelectOption("Add a field from hospitals.csv", "beds");
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const caseType = call?.[0].caseTypes[0];
    expect(caseType.identities).toContainEqual({
      datasetId: HOSPITAL_DATASET_ID,
      primaryKeyColumnId: BEDS_COLUMN_ID,
    });
    expect(
      caseType.attributes.map((attribute: { name: string }) => {
        return attribute.name;
      }),
    ).toContain("beds");
  });

  it("persists a column added to a dataset the draft already uses", async () => {
    render(<CaseTypeDraftBlock />);

    pickMantineSelectOption(
      "Add a field from long-us-deaths.csv",
      "confirmed_cases",
    );
    fireEvent.click(screen.getByRole("button", { name: "Create case type" }));

    await waitFor(() => {
      expect(applyCreatedCaseTypesMock).toHaveBeenCalled();
    });
    const [call] = applyCreatedCaseTypesMock.mock.calls;
    const names = call?.[0].caseTypes[0].attributes.map(
      (attribute: { name: string }) => {
        return attribute.name;
      },
    );
    expect(names).toContain("confirmed_cases");
  });
});
