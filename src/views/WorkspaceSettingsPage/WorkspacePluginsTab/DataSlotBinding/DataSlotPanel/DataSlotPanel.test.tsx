import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type GetAllArgument = {
  where?: Record<string, { eq?: unknown }>;
  useQueryOptions?: { enabled?: boolean };
};

const mocks = vi.hoisted(() => {
  return {
    concepts: [] as unknown[],
    datasets: [] as unknown[],
    conceptAttributes: [] as unknown[],
    datasetColumns: [] as unknown[],
    checkDataSlotBinding: vi.fn(),
  };
});

/**
 * A client's `useGetAll` that returns `getRows()`, keeping only the rows
 * whose `filter.field` equals the `filter.column` value of the query.
 */
function _makeUseGetAll(
  getRows: () => unknown[],
  filter?: { column: string; field: string },
): (argument: GetAllArgument) => unknown[] {
  return (argument) => {
    if (argument.useQueryOptions?.enabled === false) {
      return [undefined, false, {}];
    }
    const rows = getRows().filter((row) => {
      return (
        filter === undefined ||
        (row as Record<string, unknown>)[filter.field] ===
          argument.where?.[filter.column]?.eq
      );
    });
    return [rows, false, {}];
  };
}

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: _makeUseGetAll(() => {
        return mocks.concepts;
      }),
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: _makeUseGetAll(() => {
        return mocks.datasets;
      }),
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: _makeUseGetAll(
        () => {
          return mocks.conceptAttributes;
        },
        { column: "concept_id", field: "conceptId" },
      ),
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: _makeUseGetAll(
        () => {
          return mocks.datasetColumns;
        },
        { column: "dataset_id", field: "datasetId" },
      ),
    },
  };
});
vi.mock(
  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
  () => {
    return { checkDataSlotBinding: mocks.checkDataSlotBinding };
  },
);

const SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  concept: "case",
  required: false,
  attributes: {
    onsetDate: { type: "date", title: "%onset%", required: true },
    district: { type: "geo.admin2", title: "%district%", required: false },
  },
};

const TITLES: Record<string, string> = {
  "%onset%": "Onset date",
  "%district%": "District",
};

const DATASET_ID = "dataset-line-list" as Dataset.Id;
const CASE_CONCEPT_ID = "concept-case" as Concept.Id;

let queryClient: QueryClient;
let onDraftChange: ReturnType<typeof vi.fn>;

function _makeConcept(id: string, name: string): Concept.T {
  return Model.make("Concept", { id, name }) as Concept.T;
}

function _makeDatasetColumn(
  id: string,
  dataType: AvaDataType.T,
  columnIdx: number,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id,
    name: id,
    columnIdx,
    dataType,
    datasetId: DATASET_ID,
  }) as DatasetColumn.T;
}

function _makeConceptAttribute(
  id: string,
  dataType: AvaDataType.T,
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: CASE_CONCEPT_ID,
    name: id,
    dataType,
    isArray: false,
    createdAt: "2026-11-11T00:00:00Z",
  }) as ConceptAttribute.T;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function Harness(): JSX.Element {
  const [draft, setDraft] = useState<PluginDataSlotBinding.Draft>();
  return (
    <DataSlotPanel
      slotId="cases"
      slot={SLOT}
      slotTitle="Cases"
      localize={(value) => {
        return TITLES[value] ?? value;
      }}
      draft={draft}
      onDraftChange={(nextDraft) => {
        onDraftChange(nextDraft);
        setDraft(nextDraft);
      }}
    />
  );
}

function _renderPanel(): void {
  render(<Harness />, { wrapper: QueryWrapper });
}

function _getOptionLabels(comboboxName: string): string[] {
  return within(getMantineSelectDropdown(comboboxName))
    .getAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}

describe("DataSlotPanel", () => {
  beforeEach(() => {
    cleanup();
    mocks.checkDataSlotBinding.mockReset();
    mocks.checkDataSlotBinding.mockReturnValue(new Promise(() => {}));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    onDraftChange = vi.fn();
    mocks.concepts = [
      _makeConcept("concept-contacts", "Contacts"),
      _makeConcept(CASE_CONCEPT_ID, "Case"),
    ];
    mocks.datasets = [
      Model.make("Dataset", { id: DATASET_ID, name: "line_list.csv" }),
    ];
    mocks.conceptAttributes = [_makeConceptAttribute("Notes", "varchar")];
    mocks.datasetColumns = [
      _makeDatasetColumn("district", "varchar", 0),
      _makeDatasetColumn("onset", "date", 1),
      _makeDatasetColumn("age", "bigint", 2),
      _makeDatasetColumn("reported_at", "timestamp", 3),
    ];
  });

  it("lists case types named like the slot's hint first, then the rest, then datasets", () => {
    _renderPanel();

    expect(_getOptionLabels("Case type or dataset")).toEqual([
      "Case",
      "Contacts",
      "line_list.csv",
    ]);
  });

  it("groups the sources under Case types and Datasets", () => {
    _renderPanel();

    const dropdown = getMantineSelectDropdown("Case type or dataset");
    expect(within(dropdown).getByText("Case types")).toBeInTheDocument();
    expect(within(dropdown).getByText("Datasets")).toBeInTheDocument();
  });

  it("starts a draft for the chosen dataset with nothing mapped", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(onDraftChange).toHaveBeenLastCalledWith({
      slotId: "cases",
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET_ID,
      attributeMap: {},
    });
  });

  it("offers only fields whose type fits each attribute", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(_getOptionLabels("Onset date")).toEqual(["onset", "reported_at"]);
    expect(_getOptionLabels("District")).toEqual(["district"]);
  });

  it("marks a required attribute as required and an optional one as not", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(screen.getByRole("combobox", { name: "Onset date" })).toBeRequired();
    expect(
      screen.getByRole("combobox", { name: "District" }),
    ).not.toBeRequired();
  });

  it("describes each attribute picker by the attribute's type", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(
      screen.getByRole("combobox", { name: "District" }),
    ).toHaveAccessibleDescription("District, name or code");
  });

  it("disables an attribute picker when the source has no field of its type", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "Case");

    expect(screen.getByRole("combobox", { name: "Onset date" })).toBeDisabled();
  });

  it("starts the mapping over when another source is chosen", () => {
    _renderPanel();
    pickMantineSelectOption("Case type or dataset", "line_list.csv");
    pickMantineSelectOption("Onset date", "onset");

    pickMantineSelectOption("Case type or dataset", "Case");

    expect(onDraftChange).toHaveBeenLastCalledWith({
      slotId: "cases",
      sourceType: "concept",
      conceptId: CASE_CONCEPT_ID,
      datasetId: undefined,
      attributeMap: {},
    });
  });

  it("checks the records only once every required attribute has a field", async () => {
    _renderPanel();
    pickMantineSelectOption("Case type or dataset", "line_list.csv");
    expect(mocks.checkDataSlotBinding).not.toHaveBeenCalled();

    pickMantineSelectOption("Onset date", "onset");

    await waitFor(() => {
      expect(mocks.checkDataSlotBinding).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking these records",
    );
  });
});
