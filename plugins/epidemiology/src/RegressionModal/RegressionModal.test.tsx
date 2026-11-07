import { AvandarProvider, makePluginTranslator } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    ui: { openModal: vi.fn(), openDrawer: vi.fn(), notify: vi.fn() },
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
    expect(await screen.findByLabelText("Slope")).toHaveTextContent("2");
    expect(screen.getByLabelText("Intercept")).toHaveTextContent("1");
    expect(screen.getByLabelText("R²")).toHaveTextContent("1");
    expect(screen.getByLabelText("Rows used")).toHaveTextContent("5");
    expect(fetchRows).toHaveBeenCalledWith(QUERY_HANDLE, {
      columns: ["age", "weight"],
    });
  });

  it("shows no truncation note when the result was complete", async () => {
    _renderModal({});
    _clickFit();
    await screen.findByLabelText("Slope");
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

  it("clears a fitted result when a column changes", async () => {
    _renderModal({});
    _clickFit();
    await screen.findByLabelText("Slope");
    _pickColumn("Outcome (Y)", "height");
    expect(screen.queryByLabelText("Slope")).not.toBeInTheDocument();
  });
});
