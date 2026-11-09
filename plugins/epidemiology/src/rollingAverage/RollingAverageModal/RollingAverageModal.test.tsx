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
import { makeRollingAverageColumnFromOptions } from "../makeRollingAverageColumnFromOptions/makeRollingAverageColumnFromOptions";
import { RollingAverageModal } from "./RollingAverageModal";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

type Column = AvandarApi["context"]["columns"][number];
type AddColumns = NonNullable<AvandarApi["dataExplorer"]>["addColumns"];

const DAILY_COLUMNS: readonly Column[] = [
  { name: "borough", dataType: "varchar" },
  { name: "report_date", dataType: "date" },
  { name: "cases", dataType: "bigint" },
  { name: "district_id", dataType: "bigint" },
];

function _renderModal(
  options: Readonly<{
    columns?: readonly Column[];
    addColumns?: AddColumns;
    hasDataExplorer?: boolean;
  }>,
): { addColumns: ReturnType<typeof vi.fn>; closeModal: () => void } {
  const addColumns = vi.fn(
    options.addColumns ??
      (() => {
        return Promise.resolve({ columnNames: [] });
      }),
  );
  const closeModal = vi.fn();
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: options.columns ?? DAILY_COLUMNS,
      rowCount: 30,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: { fetchRows: vi.fn() },
    ui: {
      openModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal,
    },
    dataExplorer:
      options.hasDataExplorer === false ? undefined : { addColumns },
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
        <RollingAverageModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { addColumns, closeModal };
}

function _openOptions(selectLabel: string): HTMLElement {
  fireEvent.click(screen.getByRole("combobox", { name: selectLabel }));
  return screen.getByRole("listbox", { name: selectLabel, hidden: true });
}

function _pickOption(selectLabel: string, optionName: string): void {
  fireEvent.click(
    within(_openOptions(selectLabel)).getByRole("option", {
      name: optionName,
      hidden: true,
    }),
  );
}

function _setWindowSize(value: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Window" }), {
    target: { value },
  });
}

function _clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: "Add column" }));
}

describe("RollingAverageModal", () => {
  it("defaults to the first numeric and date columns, 7 days, and no group", () => {
    _renderModal({});
    expect(screen.getByRole("combobox", { name: "Value column" })).toHaveValue(
      "cases",
    );
    expect(screen.getByRole("combobox", { name: "Date column" })).toHaveValue(
      "report_date",
    );
    expect(screen.getByRole("textbox", { name: "Window" })).toHaveValue("7");
    expect(screen.getByRole("radio", { name: "Days" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveValue("");
  });

  it("adds a 7-day average of the default columns, then closes", async () => {
    const { addColumns, closeModal } = _renderModal({});
    _clickAdd();
    await waitFor(() => {
      expect(closeModal).toHaveBeenCalledTimes(1);
    });
    expect(addColumns).toHaveBeenCalledWith([
      makeRollingAverageColumnFromOptions({
        valueColumn: "cases",
        dateColumn: "report_date",
        window: { size: 7, unit: "day" },
        groupByColumn: undefined,
      }),
    ]);
  });

  it("adds a 2-week average grouped by the chosen column", async () => {
    const { addColumns } = _renderModal({});
    _setWindowSize("2");
    fireEvent.click(screen.getByRole("radio", { name: "Weeks" }));
    _pickOption("Group by", "borough");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith([
        makeRollingAverageColumnFromOptions({
          valueColumn: "cases",
          dateColumn: "report_date",
          window: { size: 2, unit: "week" },
          groupByColumn: "borough",
        }),
      ]);
    });
  });

  it("offers every column but the value and date columns to group by", () => {
    _renderModal({});
    const options = within(_openOptions("Group by")).getAllByRole("option", {
      hidden: true,
    });
    expect(
      options.map((option) => {
        return option.textContent;
      }),
    ).toEqual(["borough", "district_id"]);
  });

  it("drops a group-by column once it becomes the value column", async () => {
    const { addColumns } = _renderModal({});
    _pickOption("Group by", "district_id");
    _pickOption("Value column", "district_id");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledTimes(1);
    });
    expect(addColumns.mock.calls[0]?.[0]?.[0]?.inputs).toEqual({
      value: "district_id",
      date: "report_date",
    });
  });

  it("disables Add column until the window is a whole number of at least 1", () => {
    _renderModal({});
    const addButton = screen.getByRole("button", { name: "Add column" });
    _setWindowSize("0");
    expect(addButton).toBeDisabled();
    _setWindowSize("");
    expect(addButton).toBeDisabled();
    _setWindowSize("3");
    expect(addButton).toBeEnabled();
  });

  it("says the command expects one row per date, or per date and group", () => {
    _renderModal({});
    expect(
      screen.getByText(
        /expects one row per date, or one row per date and group/,
      ),
    ).toBeInTheDocument();
  });

  it("shows why the column was not added and stays open", async () => {
    const { closeModal } = _renderModal({
      addColumns: () => {
        return Promise.reject(
          new PluginError(
            "InvalidHandle",
            "This query result is no longer available. Run the command again.",
          ),
        );
      },
    });
    _clickAdd();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not add the column: This query result is no longer available. Run the command again.",
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
  });

  it("counts each row as 1 when the result has a date and no numeric column", async () => {
    const { addColumns } = _renderModal({
      columns: [
        { name: "borough", dataType: "varchar" },
        { name: "onset", dataType: "date" },
      ],
    });
    expect(screen.getByRole("combobox", { name: "Value column" })).toHaveValue(
      "",
    );
    expect(
      screen.getByText(/Each row counts as 1, which fits a line list/),
    ).toBeInTheDocument();
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith([
        makeRollingAverageColumnFromOptions({
          valueColumn: undefined,
          dateColumn: "onset",
          window: { size: 7, unit: "day" },
          groupByColumn: undefined,
        }),
      ]);
    });
  });

  it("counts each row as 1 after the value column is cleared", async () => {
    const { addColumns } = _renderModal({});
    fireEvent.click(screen.getByRole("button", { name: "Count each row" }));
    expect(
      screen.getByText(/Each row counts as 1, which fits a line list/),
    ).toBeInTheDocument();
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith([
        makeRollingAverageColumnFromOptions({
          valueColumn: undefined,
          dateColumn: "report_date",
          window: { size: 7, unit: "day" },
          groupByColumn: undefined,
        }),
      ]);
    });
  });

  it("explains that a date column is needed when the result has none", () => {
    _renderModal({
      columns: [
        { name: "borough", dataType: "varchar" },
        { name: "cases", dataType: "bigint" },
      ],
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This command needs a date column.",
    );
    expect(
      screen.queryByRole("button", { name: "Add column" }),
    ).not.toBeInTheDocument();
  });

  it("explains that columns can be added only in the Data Explorer without its API", () => {
    _renderModal({ hasDataExplorer: false });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Columns can be added only to a query result in the Data Explorer.",
    );
    expect(
      screen.queryByRole("button", { name: "Add column" }),
    ).not.toBeInTheDocument();
  });
});
