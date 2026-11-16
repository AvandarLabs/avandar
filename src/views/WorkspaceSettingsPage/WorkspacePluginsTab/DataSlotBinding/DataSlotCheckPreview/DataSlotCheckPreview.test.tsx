import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen, waitFor } from "@/test-utils";
import { DataSlotCheckPreview } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const { checkDataSlotBindingMock } = vi.hoisted(() => {
  return { checkDataSlotBindingMock: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
  () => {
    return { checkDataSlotBinding: checkDataSlotBindingMock };
  },
);

const SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: { type: "date", title: "%onset%", required: true },
    district: { type: "geo.admin2", title: "%district%", required: false },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const REPORTED_FIELD: DataSlotSourceField = {
  id: "col_reported",
  columnName: "reported_at",
  label: "reported_at",
  dataType: "timestamp",
};

const SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: "dataset-id" as Dataset.Id,
  name: "line_list.csv",
  fields: [ONSET_FIELD, REPORTED_FIELD],
};

const TITLES: Record<string, string> = {
  "%onset%": "Onset date",
  "%district%": "District",
};

let queryClient: QueryClient;

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _makePreview(onsetField: DataSlotSourceField): JSX.Element {
  return (
    <DataSlotCheckPreview
      slot={SLOT}
      slotTitle="Cases"
      localize={(value) => {
        return TITLES[value] ?? value;
      }}
      source={SOURCE}
      fieldsByAttributeKey={{ onsetDate: onsetField, district: undefined }}
    />
  );
}

describe("DataSlotCheckPreview", () => {
  beforeEach(() => {
    cleanup();
    checkDataSlotBindingMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("says it is checking while the check runs", () => {
    checkDataSlotBindingMock.mockReturnValue(new Promise(() => {}));

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking these records",
    );
  });

  it("checks the mapping it is given in the current workspace", async () => {
    checkDataSlotBindingMock.mockReturnValue(new Promise(() => {}));

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(checkDataSlotBindingMock).toHaveBeenCalledWith({
        workspaceId: "workspace-id",
        slot: SLOT,
        source: SOURCE,
        fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
      });
    });
  });

  it("shows the row count, each attribute's filled count, and the first rows", async () => {
    checkDataSlotBindingMock.mockResolvedValue({
      rowCount: 12,
      filledCountsByAttributeKey: { onsetDate: 12, district: 0 },
      sampleRows: [{ onsetDate: "2026-01-05", district: null }],
    });

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(await screen.findByText("12 records")).toBeInTheDocument();
    expect(
      screen.getByText("Onset date: 12 of 12 have a value"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("District: 0 of 12 have a value"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Onset date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "2026-01-05" }),
    ).toBeInTheDocument();
  });

  it("says why when the records cannot be read", async () => {
    checkDataSlotBindingMock.mockRejectedValue(
      new Error("Catalog Error: Table does not exist"),
    );

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(
      await screen.findByText("Could not read these records."),
    ).toBeInTheDocument();
    // The app's error toast repeats the message, so find the inline detail
    // by its language mark.
    const detail = screen
      .getAllByText("Catalog Error: Table does not exist")
      .find((element) => {
        return element.getAttribute("lang") === "en";
      });
    expect(detail).toBeDefined();
  });

  it("checks again when a mapped field changes", async () => {
    checkDataSlotBindingMock.mockResolvedValue({
      rowCount: 1,
      filledCountsByAttributeKey: { onsetDate: 1, district: 0 },
      sampleRows: [],
    });
    const { rerender } = render(_makePreview(ONSET_FIELD), {
      wrapper: QueryWrapper,
    });
    await screen.findByText("1 record");

    rerender(_makePreview(REPORTED_FIELD));

    await waitFor(() => {
      expect(checkDataSlotBindingMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fieldsByAttributeKey: {
            onsetDate: REPORTED_FIELD,
            district: undefined,
          },
        }),
      );
    });
    expect(checkDataSlotBindingMock).toHaveBeenCalledTimes(2);
  });

  describe("date cells", () => {
    // DuckDB-Wasm hands a DATE or TIMESTAMP over as epoch milliseconds in UTC.
    const JAN_19_2026 = 1_768_780_800_000;
    const JAN_19_2026_AT_1230 = 1_768_825_845_000;
    const originalTimezone = process.env.TZ;

    beforeAll(() => {
      // A viewer west of UTC is where a UTC-midnight date slips a day back.
      process.env.TZ = "America/New_York";
    });

    afterAll(() => {
      process.env.TZ = originalTimezone;
    });

    async function _renderSampleOnsetDates(
      onsetDates: readonly number[],
    ): Promise<void> {
      checkDataSlotBindingMock.mockResolvedValue({
        rowCount: onsetDates.length,
        filledCountsByAttributeKey: {
          onsetDate: onsetDates.length,
          district: 0,
        },
        sampleRows: onsetDates.map((onsetDate) => {
          return { onsetDate, district: null };
        }),
      });
      render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });
      await screen.findByRole("columnheader", { name: "Onset date" });
    }

    it("shows a date as its calendar day, not epoch milliseconds or the day before", async () => {
      await _renderSampleOnsetDates([JAN_19_2026]);

      expect(
        screen.getByRole("cell", { name: "2026-01-19" }),
      ).toBeInTheDocument();
    });

    it("shows the time of day when the sample holds timestamps", async () => {
      await _renderSampleOnsetDates([JAN_19_2026, JAN_19_2026_AT_1230]);

      expect(
        screen.getByRole("cell", { name: "2026-01-19 12:30:45" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("cell", { name: "2026-01-19 00:00:00" }),
      ).toBeInTheDocument();
    });
  });
});
