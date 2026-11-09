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
import { makeIncidenceColumnsFromOptions } from "../makeIncidenceColumnsFromOptions/makeIncidenceColumnsFromOptions";
import { IncidenceModal } from "./IncidenceModal";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

type Column = AvandarApi["context"]["columns"][number];
type AddColumns = NonNullable<AvandarApi["dataExplorer"]>["addColumns"];

const BOROUGH_COLUMNS: readonly Column[] = [
  { name: "borough", dataType: "varchar" },
  { name: "case_count", dataType: "bigint" },
  { name: "pop_2024", dataType: "bigint" },
  { name: "deaths", dataType: "bigint" },
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
      columns: options.columns ?? BOROUGH_COLUMNS,
      rowCount: 5,
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
        <IncidenceModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { addColumns, closeModal };
}

function _pickOption(selectLabel: string, optionName: string): void {
  fireEvent.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = screen.getByRole("listbox", {
    name: selectLabel,
    hidden: true,
  });
  fireEvent.click(
    within(listbox).getByRole("option", { name: optionName, hidden: true }),
  );
}

function _clickRadio(groupName: string, optionName: string): void {
  const group = screen.getByRole("radiogroup", { name: groupName });
  fireEvent.click(within(group).getByRole("radio", { name: optionName }));
}

function _clickAdd(): void {
  fireEvent.click(screen.getByRole("button", { name: "Add columns" }));
}

describe("IncidenceModal", () => {
  it("defaults to the first two numeric columns and a rate per 100,000", () => {
    _renderModal({});
    expect(screen.getByRole("combobox", { name: "Cases column" })).toHaveValue(
      "case_count",
    );
    expect(
      screen.getByRole("combobox", { name: "Population column" }),
    ).toHaveValue("pop_2024");
    expect(screen.getByRole("radio", { name: "100,000" })).toBeChecked();
  });

  it("adds the rate and interval columns for the chosen columns, then closes", async () => {
    const { addColumns, closeModal } = _renderModal({});
    _clickAdd();
    await waitFor(() => {
      expect(closeModal).toHaveBeenCalledTimes(1);
    });
    expect(addColumns).toHaveBeenCalledWith(
      makeIncidenceColumnsFromOptions({
        casesColumn: "case_count",
        population: { kind: "column", columnName: "pop_2024" },
        base: 100_000,
      }),
    );
  });

  it("adds columns per the chosen base over a fixed population", async () => {
    const { addColumns } = _renderModal({});
    _clickRadio("Population", "Fixed number");
    fireEvent.change(screen.getByRole("textbox", { name: "Population size" }), {
      target: { value: "8336817" },
    });
    _clickRadio("Rate per", "1,000");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledWith(
        makeIncidenceColumnsFromOptions({
          casesColumn: "case_count",
          population: { kind: "fixed", value: 8_336_817 },
          base: 1_000,
        }),
      );
    });
  });

  it("adds columns for a cases column the user picks", async () => {
    const { addColumns } = _renderModal({});
    _pickOption("Cases column", "deaths");
    _clickAdd();
    await waitFor(() => {
      expect(addColumns).toHaveBeenCalledTimes(1);
    });
    expect(addColumns.mock.calls[0]?.[0]?.[0]?.inputs).toEqual({
      cases: "deaths",
      population: "pop_2024",
    });
  });

  it("starts on a fixed population when there is one numeric column", () => {
    _renderModal({
      columns: [
        { name: "borough", dataType: "varchar" },
        { name: "case_count", dataType: "bigint" },
      ],
    });
    expect(screen.getByRole("radio", { name: "Fixed number" })).toBeChecked();
    expect(
      screen.getByRole("textbox", { name: "Population size" }),
    ).toBeInTheDocument();
  });

  it("disables Add columns until the fixed population is at least 1", () => {
    _renderModal({});
    _clickRadio("Population", "Fixed number");
    const addButton = screen.getByRole("button", { name: "Add columns" });
    expect(addButton).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Population size" }), {
      target: { value: "1" },
    });
    expect(addButton).toBeEnabled();
  });

  it("shows why the columns were not added and stays open", async () => {
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
      "Could not add the columns: This query result is no longer available. Run the command again.",
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add columns" })).toBeEnabled();
  });

  it("explains that a numeric column is needed when there is none", () => {
    _renderModal({ columns: [{ name: "borough", dataType: "varchar" }] });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This command needs a numeric column of case counts.",
    );
    expect(
      screen.queryByRole("button", { name: "Add columns" }),
    ).not.toBeInTheDocument();
  });

  it("explains that columns can be added only in the Data Explorer without its API", () => {
    _renderModal({ hasDataExplorer: false });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Columns can be added only to a query result in the Data Explorer.",
    );
    expect(
      screen.queryByRole("button", { name: "Add columns" }),
    ).not.toBeInTheDocument();
  });
});
