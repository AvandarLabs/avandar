import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@/test-utils";
import {
  buildSearchResult,
  DASHBOARD_REF,
  DATASET_REF,
  MAP_REF,
  trayMocks as mocks,
  openPicker,
  renderTray,
  TILE_REF,
} from "./ChatContextTrayTestFixtures";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

// Mantine keeps the dropdown at `display: none` under happy-dom, so every
// query inside it includes hidden elements.

const CASE_REF: Gadget.Ref = {
  gadgetType: "individual",
  gadgetId: "dddddddd-4444-4444-8444-dddddddddddd",
  subId: null,
};

function _getGroupNames(): string[] {
  return within(screen.getByRole("listbox", { hidden: true }))
    .getAllByRole("group", { hidden: true })
    .map((group) => {
      return group.getAttribute("aria-labelledby") ?? "";
    })
    .map((labelId) => {
      return document.getElementById(labelId)?.textContent ?? "";
    });
}

function _getTrayLinks(): string[] {
  const list = screen.queryByRole("list", { name: "Attached to this chat" });
  return list
    ? within(list)
        .getAllByRole("link")
        .map((link) => {
          return link.textContent ?? "";
        })
    : [];
}

describe("ChatContextPicker", () => {
  it("lists this page's items first, then recent ones", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DATASET_REF, "US deaths"),
    ]);
    renderTray({ pageRefs: [DASHBOARD_REF] });

    await openPicker();

    const pageGroup = await screen.findByRole("group", {
      hidden: true,
      name: "On this page",
    });
    expect(
      within(pageGroup).getByRole("option", {
        hidden: true,
        name: /Measles by borough/,
      }),
    ).toBeInTheDocument();
    const recentGroup = await screen.findByRole("group", {
      hidden: true,
      name: "Recent",
    });
    expect(
      within(recentGroup).getByRole("option", {
        hidden: true,
        name: /US deaths/,
      }),
    ).toBeInTheDocument();
    expect(_getGroupNames()).toEqual(["On this page", "Recent"]);
    expect(mocks.searchGadgets).toHaveBeenCalledWith(
      expect.objectContaining({ query: "" }),
    );
  });

  it("does not repeat this page's items under Recent", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DASHBOARD_REF, "Measles by borough"),
      buildSearchResult(DATASET_REF, "US deaths"),
    ]);
    renderTray({ pageRefs: [DASHBOARD_REF] });

    await openPicker();

    const recentGroup = await screen.findByRole("group", {
      hidden: true,
      name: "Recent",
    });
    expect(
      within(recentGroup).queryByRole("option", {
        hidden: true,
        name: /Measles by borough/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("option", {
        hidden: true,
        name: /Measles by borough/,
      }),
    ).toHaveLength(1);
  });

  it("leaves out an unavailable page item", async () => {
    renderTray({
      pageRefs: [
        DASHBOARD_REF,
        { ...DATASET_REF, gadgetId: "99999999-9999-4999-8999-999999999999" },
      ],
    });

    await openPicker();

    const pageGroup = await screen.findByRole("group", {
      hidden: true,
      name: "On this page",
    });
    expect(
      within(pageGroup).getAllByRole("option", { hidden: true }),
    ).toHaveLength(1);
  });

  it("never lists a case", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(CASE_REF, "Jane Doe", "Measles case"),
      buildSearchResult(MAP_REF, "Outbreak map"),
    ]);
    renderTray();

    await openPicker();

    expect(
      await screen.findByRole("option", { hidden: true, name: /Outbreak map/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { hidden: true, name: /Jane Doe/ }),
    ).not.toBeInTheDocument();
  });

  it("searches as the user types", async () => {
    renderTray({ pageRefs: [DASHBOARD_REF] });
    const search = await openPicker();
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(TILE_REF, "Weekly cases", "Measles by borough"),
    ]);

    fireEvent.change(search, { target: { value: "weekly" } });

    const resultsGroup = await screen.findByRole("group", {
      hidden: true,
      name: "Results",
    });
    const option = within(resultsGroup).getByRole("option", {
      hidden: true,
      name: /Weekly cases/,
    });
    expect(option).toHaveTextContent("Measles by borough");
    expect(
      screen.queryByRole("group", { hidden: true, name: "On this page" }),
    ).not.toBeInTheDocument();
    expect(mocks.searchGadgets).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "weekly" }),
    );
  });

  it("shows the type name when a result has no detail", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DATASET_REF, "US deaths"),
    ]);
    renderTray();

    await openPicker();

    expect(
      await screen.findByRole("option", { hidden: true, name: /US deaths/ }),
    ).toHaveTextContent("Dataset");
  });

  it("attaches a picked item and closes", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DATASET_REF, "US deaths"),
    ]);
    renderTray();
    await openPicker();

    fireEvent.click(
      await screen.findByRole("option", { hidden: true, name: /US deaths/ }),
    );

    expect(_getTrayLinks()).toEqual(["US deaths"]);
    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", {
          name: "Search dashboards, datasets, maps...",
        }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add context" })).toHaveFocus();
  });

  it("attaches the highlighted item with the keyboard", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DATASET_REF, "US deaths"),
      buildSearchResult(MAP_REF, "Outbreak map"),
    ]);
    renderTray({ contextTray: [DATASET_REF] });
    const search = await openPicker();
    await screen.findByRole("option", { hidden: true, name: /Outbreak map/ });

    // The attached dataset comes first, and the arrow skips it.
    fireEvent.keyDown(search, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    expect(_getTrayLinks()).toEqual(["US deaths", "Outbreak map"]);
  });

  it("closes on Escape and returns focus to Add context", async () => {
    renderTray();
    const search = await openPicker();

    fireEvent.keyDown(search, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", {
          name: "Search dashboards, datasets, maps...",
        }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add context" })).toHaveFocus();
  });

  it("marks attached items as added", async () => {
    mocks.searchGadgets.mockResolvedValue([
      buildSearchResult(DATASET_REF, "US deaths"),
    ]);
    renderTray({ contextTray: [DATASET_REF], pageRefs: [DASHBOARD_REF] });
    await openPicker();

    const option = await screen.findByRole("option", {
      hidden: true,
      name: /US deaths/,
    });
    expect(option).toHaveAttribute("aria-disabled", "true");
    expect(option).toHaveTextContent("Added");

    fireEvent.click(option);
    expect(_getTrayLinks()).toEqual(["US deaths"]);
    expect(
      screen.getByRole("option", { hidden: true, name: /Measles by borough/ }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("shows the retry message when search fails", async () => {
    mocks.searchGadgets.mockRejectedValue(new Error("offline"));
    renderTray();

    await openPicker();

    expect(
      await screen.findByText("Search failed. Try again."),
    ).toBeInTheDocument();
  });

  it("says when nothing matched", async () => {
    renderTray();
    const search = await openPicker();

    fireEvent.change(search, { target: { value: "zzz" } });

    expect(await screen.findByText("Nothing found")).toBeInTheDocument();
  });

  it("says it is searching before results arrive", async () => {
    mocks.searchGadgets.mockReturnValue(
      new Promise(() => {
        // Never settles, so the search stays in flight.
      }),
    );
    renderTray();

    await openPicker();

    expect(await screen.findByText("Searching...")).toBeInTheDocument();
  });

  it("labels the list of choices", async () => {
    renderTray();

    await openPicker();

    expect(
      screen.getByRole("listbox", { hidden: true, name: "Add context" }),
    ).toBeInTheDocument();
  });
});
