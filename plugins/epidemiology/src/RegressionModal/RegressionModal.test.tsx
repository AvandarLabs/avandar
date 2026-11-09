import { AvandarProvider, makePluginTranslator } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import englishMessages from "../../locales/en.json";
import { RegressionModal } from "./RegressionModal";
import type {
  AvandarApi,
  FetchRowsResult,
  QueryHandle,
} from "@avandar/plugin-sdk";

type Column = AvandarApi["context"]["columns"][number];

const QUERY_HANDLE = "query-handle-1" as QueryHandle;
const THREE_NUMERIC_COLUMNS: readonly Column[] = [
  { name: "age", dataType: "bigint" },
  { name: "weight", dataType: "double" },
  { name: "height", dataType: "double" },
  { name: "city", dataType: "varchar" },
];
const EXACT_LINE_ROWS = [1, 2, 3, 4, 5].map((age) => {
  return { age, weight: 2 * age + 1 };
});

function _makeRowsResult(options?: Partial<FetchRowsResult>): FetchRowsResult {
  return { rows: EXACT_LINE_ROWS, isTruncated: false, ...options };
}

function _renderModal(options: {
  columns?: readonly Column[];
  fetchRows?: AvandarApi["data"]["fetchRows"];
  t?: AvandarApi["i18n"]["t"];
}): { fetchRows: ReturnType<typeof vi.fn> } {
  const fetchRows = vi.fn(
    options.fetchRows ??
      (() => {
        return Promise.resolve(_makeRowsResult());
      }),
  );
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: QUERY_HANDLE,
      columns: options.columns ?? THREE_NUMERIC_COLUMNS,
      rowCount: 5,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: { fetchRows },
    ui: {
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
    },
    i18n: {
      t:
        options.t ??
        makePluginTranslator({
          locale: "en-US",
          messages: { en: englishMessages },
        }),
    },
  };
  render(
    <MantineProvider>
      <AvandarProvider api={api}>
        <RegressionModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { fetchRows };
}

function _pickColumn(selectLabel: string, optionName: string): void {
  fireEvent.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = screen.getByRole("listbox", {
    name: selectLabel,
    hidden: true,
  });
  fireEvent.click(
    within(listbox).getByRole("option", { name: optionName, hidden: true }),
  );
}

function _clickFit(): void {
  fireEvent.click(screen.getByRole("button", { name: "Fit regression" }));
}

function _makeRowsFromAges(
  getWeight: (age: number) => number,
): FetchRowsResult["rows"] {
  return [1, 2, 3, 4, 5].map((age) => {
    return { age, weight: getWeight(age) };
  });
}

function _expectStatistic(label: string, value: string): void {
  const group = screen.getByRole("group", { name: label });
  expect(within(group).getByText(value)).toBeInTheDocument();
}

/**
 * Runs `action` while collecting unhandled promise rejections instead of
 * letting the test runner report them as failures.
 */
async function _collectUnhandledRejections(
  action: () => Promise<void>,
): Promise<unknown[]> {
  const reasons: unknown[] = [];
  const runnerListeners = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", (reason) => {
    reasons.push(reason);
  });
  try {
    await action();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  } finally {
    process.removeAllListeners("unhandledRejection");
    runnerListeners.forEach((listener) => {
      process.on("unhandledRejection", listener);
    });
  }
  return reasons;
}

describe("RegressionModal", () => {
  it("defaults X and Y to the first two numeric columns", () => {
    _renderModal({});
    expect(screen.getByRole("combobox", { name: "Predictor (X)" })).toHaveValue(
      "age",
    );
    expect(screen.getByRole("combobox", { name: "Outcome (Y)" })).toHaveValue(
      "weight",
    );
  });

  it("fits the chosen columns and shows slope, intercept, R squared, and rows used", async () => {
    const { fetchRows } = _renderModal({});
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    _expectStatistic("Slope", "2");
    _expectStatistic("Intercept", "1");
    _expectStatistic("R²", "1");
    _expectStatistic("Rows used", "5");
    expect(fetchRows).toHaveBeenCalledWith(QUERY_HANDLE, {
      columns: ["age", "weight"],
    });
  });

  it("shows the fitted statistics of noisy data", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.resolve(
          _makeRowsResult({
            rows: [
              { age: 1, weight: 1 },
              { age: 2, weight: 3 },
              { age: 3, weight: 2 },
              { age: 4, weight: 5 },
            ],
          }),
        );
      },
    });
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    _expectStatistic("Slope", "1.1");
    _expectStatistic("Intercept", "0");
    _expectStatistic("R²", "0.6914");
    _expectStatistic("Rows used", "4");
  });

  it.each([
    [0.00001, "0.00001"],
    [-0.00001, "-0.00001"],
  ])(
    "shows a slope of %s as %s instead of rounding it to zero",
    async (slope, text) => {
      _renderModal({
        fetchRows: () => {
          return Promise.resolve(
            _makeRowsResult({
              rows: _makeRowsFromAges((age) => {
                return slope * age;
              }),
            }),
          );
        },
      });
      _clickFit();
      await screen.findByRole("group", { name: "Slope" });
      _expectStatistic("Slope", text);
    },
  );

  it("shows R squared as not available when Y never varies", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.resolve(
          _makeRowsResult({
            rows: _makeRowsFromAges(() => {
              return 5;
            }),
          }),
        );
      },
    });
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    _expectStatistic("Slope", "0");
    _expectStatistic("Intercept", "5");
    _expectStatistic("R²", "Not available");
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("shows the not-enough-data message when the slope and intercept overflow", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.resolve(
          _makeRowsResult({
            rows: [
              { age: 1e200, weight: 1e300 },
              { age: 2e200, weight: 3e300 },
              { age: 3e200, weight: 2e300 },
            ],
          }),
        );
      },
    });
    _clickFit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "where X varies",
    );
    expect(screen.queryByRole("group", { name: "Slope" })).toBeNull();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("announces a fitted result through a polite live region", async () => {
    _renderModal({});
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toBeEmptyDOMElement();
    _clickFit();
    const slope = await screen.findByRole("group", { name: "Slope" });
    expect(liveRegion).toContainElement(slope);
  });

  it("disables both pickers and the button while a fit is running", async () => {
    const pendingRows = Promise.withResolvers<FetchRowsResult>();
    _renderModal({
      fetchRows: () => {
        return pendingRows.promise;
      },
    });
    const xPicker = screen.getByRole("combobox", { name: "Predictor (X)" });
    const yPicker = screen.getByRole("combobox", { name: "Outcome (Y)" });
    const fitButton = screen.getByRole("button", { name: "Fit regression" });
    _clickFit();
    expect(xPicker).toBeDisabled();
    expect(yPicker).toBeDisabled();
    expect(fitButton).toBeDisabled();
    pendingRows.resolve(_makeRowsResult());
    await screen.findByRole("group", { name: "Slope" });
    expect(xPicker).toBeEnabled();
    expect(yPicker).toBeEnabled();
    expect(fitButton).toBeEnabled();
  });

  it("shows no truncation note when the result was complete", async () => {
    _renderModal({});
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    expect(screen.queryByText(/Fitted on the first/)).not.toBeInTheDocument();
  });

  it("notes that the fit used only the first rows of a truncated result", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.resolve(_makeRowsResult({ isTruncated: true }));
      },
    });
    _clickFit();
    expect(
      await screen.findByText("Fitted on the first 5 rows of the result."),
    ).toBeInTheDocument();
  });

  it("shows the not-enough-data message instead of pickers with fewer than two numeric columns", () => {
    _renderModal({
      columns: [
        { name: "age", dataType: "bigint" },
        { name: "city", dataType: "varchar" },
      ],
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pick two different numeric columns with at least two rows where X varies.",
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fit regression" }),
    ).not.toBeInTheDocument();
  });

  it("refuses to fit a column against itself", async () => {
    const { fetchRows } = _renderModal({});
    _pickColumn("Outcome (Y)", "age");
    _clickFit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pick two different numeric columns",
    );
    expect(fetchRows).not.toHaveBeenCalled();
  });

  it("shows the not-enough-data message when X never varies", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.resolve(
          _makeRowsResult({
            rows: [
              { age: 7, weight: 1 },
              { age: 7, weight: 2 },
            ],
          }),
        );
      },
    });
    _clickFit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "where X varies",
    );
  });

  it("shows the reason when the result cannot be read", async () => {
    _renderModal({
      fetchRows: () => {
        return Promise.reject(new Error("query expired"));
      },
    });
    _clickFit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not read the result: query expired",
    );
  });

  it("clears a fitted result when the X column changes", async () => {
    _renderModal({});
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    _pickColumn("Predictor (X)", "height");
    expect(screen.queryByRole("group", { name: "Slope" })).toBeNull();
  });

  it("clears a fitted result when the Y column changes", async () => {
    _renderModal({});
    _clickFit();
    await screen.findByRole("group", { name: "Slope" });
    _pickColumn("Outcome (Y)", "height");
    expect(screen.queryByRole("group", { name: "Slope" })).toBeNull();
  });

  it("re-enables the pickers when a fit fails unexpectedly", async () => {
    const translator = makePluginTranslator({
      locale: "en-US",
      messages: { en: englishMessages },
    });
    _renderModal({
      t: (key, values) => {
        if (key === "modal.notEnoughData") {
          throw new Error("translator broke");
        }
        return translator(key, values);
      },
    });
    _pickColumn("Outcome (Y)", "age");
    const reasons = await _collectUnhandledRejections(async () => {
      _clickFit();
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: "Predictor (X)" }),
        ).toBeEnabled();
      });
    });
    expect(reasons).toEqual([new Error("translator broke")]);
  });
});
