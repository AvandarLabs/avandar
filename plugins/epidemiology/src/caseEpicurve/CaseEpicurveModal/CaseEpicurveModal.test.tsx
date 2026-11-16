import {
  AvandarProvider,
  makePluginTranslator,
  PluginError,
} from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import englishMessages from "../../../locales/en.json";
import { CaseEpicurveModal } from "./CaseEpicurveModal";
import type {
  AvandarApi,
  FetchRowsResult,
  QueryHandle,
  QuerySlotResult,
} from "@avandar/plugin-sdk";

const SLOT_HANDLE = "slot-handle-1" as QueryHandle;

const CASE_ROWS: FetchRowsResult["rows"] = [
  { onsetDate: "2026-01-05", district: "Ilala" },
  { onsetDate: "2026-01-07", district: "Kinondoni" },
  { onsetDate: "2026-01-07", district: "Ilala" },
];

function _makeSlotResult(
  overrides: Partial<QuerySlotResult> = {},
): QuerySlotResult {
  return {
    queryHandle: SLOT_HANDLE,
    columns: [
      { name: "onsetDate", dataType: "date" },
      { name: "district", dataType: "varchar" },
    ],
    rowCount: CASE_ROWS.length,
    isTruncated: false,
    ...overrides,
  };
}

function _renderModal(
  options: {
    querySlot?: AvandarApi["data"]["querySlot"] | null;
    rows?: FetchRowsResult["rows"];
    openDataSlotBinding?: AvandarApi["ui"]["openDataSlotBinding"] | null;
  } = {},
): { api: AvandarApi } {
  const rows = options.rows ?? CASE_ROWS;
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: [],
      rowCount: 0,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows, isTruncated: false });
      }),
      querySlot:
        options.querySlot === null
          ? undefined
          : (options.querySlot ??
            vi.fn(() => {
              return Promise.resolve(_makeSlotResult());
            })),
    },
    ui: {
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      openDataSlotBinding:
        options.openDataSlotBinding === null
          ? undefined
          : (options.openDataSlotBinding ??
            vi.fn(() => {
              return Promise.resolve();
            })),
    },
    i18n: {
      t: makePluginTranslator({
        locale: "en-US",
        messages: { en: englishMessages },
      }),
    },
  };
  render(
    <MantineProvider>
      <AvandarProvider api={api}>
        <CaseEpicurveModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { api };
}

function _rejectWith(
  code: "SlotNotBound" | "SlotBroken" | "PermissionDenied",
): AvandarApi["data"]["querySlot"] {
  return vi.fn(() => {
    return Promise.reject(new PluginError(code, `The slot failed: ${code}.`));
  });
}

function _getTickTexts(): string[] {
  return Array.from(
    document.querySelectorAll(
      ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
    ),
  ).map((tick) => {
    return tick.textContent ?? "";
  });
}

function _getLegendTexts(): string[] {
  return Array.from(
    document.querySelectorAll(".recharts-legend-item-text"),
  ).map((item) => {
    return item.textContent ?? "";
  });
}

describe("CaseEpicurveModal", () => {
  it("says it is reading the case records until they arrive", () => {
    _renderModal({
      querySlot: () => {
        return new Promise(() => {});
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading the case records…",
    );
  });

  it("draws the epicurve of the bound cases", async () => {
    _renderModal();

    expect(
      await screen.findByRole("img", { name: "Case epicurve" }),
    ).toBeInTheDocument();
  });

  it("reads the onset date and district of every case the slot holds", async () => {
    const { api } = _renderModal();

    await screen.findByRole("img", { name: "Case epicurve" });

    expect(api.data.querySlot).toHaveBeenCalledWith("cases");
    expect(api.data.fetchRows).toHaveBeenCalledWith(SLOT_HANDLE, {
      columns: ["onsetDate", "district"],
      limit: CASE_ROWS.length,
    });
  });

  it("buckets the cases by epi week until another interval is picked", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    expect(_getTickTexts()).toEqual(["2026-01-04"]);
  });

  it("buckets the cases by day when Day is picked", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    fireEvent.click(screen.getByRole("radio", { name: "Day" }));

    await waitFor(() => {
      expect(_getTickTexts()).toEqual([
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
      ]);
    });
  });

  it("stacks the bars by district when Stack by district is on", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    fireEvent.click(screen.getByRole("switch", { name: "Stack by district" }));

    await waitFor(() => {
      expect(_getLegendTexts()).toEqual(["Ilala", "Kinondoni"]);
    });
  });

  it("disables Stack by district with a reason when no case has a district", async () => {
    _renderModal({
      rows: [
        { onsetDate: "2026-01-05", district: null },
        { onsetDate: "2026-01-07", district: null },
      ],
    });
    await screen.findByRole("img", { name: "Case epicurve" });

    const stackSwitch = screen.getByRole("switch", {
      name: "Stack by district",
    });

    expect(stackSwitch).toBeDisabled();
    expect(stackSwitch).toHaveAccessibleDescription(
      "None of these cases has a district.",
    );
  });

  it("says there is nothing to chart when no case has an onset date", async () => {
    _renderModal({
      rows: [{ onsetDate: null, district: "Ilala" }],
    });

    expect(
      await screen.findByText(
        "None of these cases has an onset date to chart.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Case epicurve" })).toBeNull();
  });

  it("notes that only the first cases were drawn when the slot holds more", async () => {
    _renderModal({
      querySlot: () => {
        return Promise.resolve(_makeSlotResult({ isTruncated: true }));
      },
    });

    expect(
      await screen.findByText("Drawn from the first 3 cases."),
    ).toBeInTheDocument();
  });

  it("asks to choose the case records when none are chosen", async () => {
    _renderModal({ querySlot: _rejectWith("SlotNotBound") });

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "No case records are chosen for this plugin yet.",
    );
    expect(
      within(alert).getByRole("button", { name: "Choose records" }),
    ).toBeInTheDocument();
  });

  it("asks to choose the case records again when the chosen ones no longer fit", async () => {
    _renderModal({ querySlot: _rejectWith("SlotBroken") });

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "The case records chosen for this plugin have changed",
    );
    expect(
      within(alert).getByRole("button", { name: "Choose records" }),
    ).toBeInTheDocument();
  });

  it("opens the cases binding and reads the cases again once it closes", async () => {
    const querySlot = vi
      .fn<NonNullable<AvandarApi["data"]["querySlot"]>>()
      .mockRejectedValueOnce(new PluginError("SlotNotBound", "Not bound."))
      .mockResolvedValue(_makeSlotResult());
    const openDataSlotBinding = vi.fn(() => {
      return Promise.resolve();
    });
    _renderModal({ querySlot, openDataSlotBinding });

    fireEvent.click(
      await screen.findByRole("button", { name: "Choose records" }),
    );

    expect(
      await screen.findByRole("img", { name: "Case epicurve" }),
    ).toBeInTheDocument();
    expect(openDataSlotBinding).toHaveBeenCalledWith("cases");
  });

  it("offers no Choose records button when the host cannot open the binding", async () => {
    _renderModal({
      querySlot: _rejectWith("SlotNotBound"),
      openDataSlotBinding: null,
    });

    await screen.findByRole("alert");

    expect(screen.queryByRole("button", { name: "Choose records" })).toBeNull();
  });

  it("shows the reason when the case records cannot be read", async () => {
    _renderModal({ querySlot: _rejectWith("PermissionDenied") });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not read the case records: The slot failed: PermissionDenied.",
    );
  });

  it("explains that case records cannot be read when the host offers no querySlot", async () => {
    _renderModal({ querySlot: null });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This version of Avandar cannot read case records for plugins.",
    );
  });
});
