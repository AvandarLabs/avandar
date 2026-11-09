import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@/test-utils";
import {
  buildDatasetRef,
  DASHBOARD_REF,
  DATASET_REF,
  renderTray,
  setLoadingSummary,
} from "./ChatContextTrayTestFixtures";

function _getTrayList(): HTMLElement {
  return screen.getByRole("list", { name: "Attached to this chat" });
}

describe("ChatContextTray", () => {
  it("shows no list while nothing is attached", () => {
    renderTray();

    expect(
      screen.queryByRole("list", { name: "Attached to this chat" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add context" })).toBeEnabled();
  });

  it("shows each attached gadget with a remove button", () => {
    renderTray({ contextTray: [DASHBOARD_REF, DATASET_REF] });

    const items = within(_getTrayList()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole("link", { name: "Measles by borough" }),
    ).toBeInTheDocument();
    expect(
      within(items[0]!).getByRole("button", {
        name: "Remove Measles by borough from context",
      }),
    ).toBeInTheDocument();
    expect(
      within(items[1]!).getByRole("button", {
        name: "Remove US deaths from context",
      }),
    ).toBeInTheDocument();
  });

  it("names the remove button generically while the name loads", () => {
    setLoadingSummary(DATASET_REF);
    renderTray({ contextTray: [DATASET_REF] });

    expect(
      within(_getTrayList()).getByRole("button", {
        name: "Remove from context",
      }),
    ).toBeInTheDocument();
  });

  it("removes a gadget and moves focus to Add context", () => {
    renderTray({ contextTray: [DASHBOARD_REF, DATASET_REF] });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove US deaths from context" }),
    );

    expect(within(_getTrayList()).getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.queryByRole("link", { name: "US deaths" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add context" })).toHaveFocus();
  });

  it("drops the list when the last gadget is removed", () => {
    renderTray({ contextTray: [DATASET_REF] });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove US deaths from context" }),
    );

    expect(
      screen.queryByRole("list", { name: "Attached to this chat" }),
    ).not.toBeInTheDocument();
  });

  it("disables Add context at five, with the reason", async () => {
    renderTray({
      contextTray: [1, 2, 3, 4, 5].map(buildDatasetRef),
    });

    const addButton = screen.getByRole("button", { name: "Add context" });
    expect(addButton).toHaveAttribute("aria-disabled", "true");
    expect(addButton).toHaveAccessibleDescription(
      "You can attach up to 5 items.",
    );

    fireEvent.mouseEnter(addButton.parentElement!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "You can attach up to 5 items.",
    );
  });

  it("keeps the disabled Add context reachable by keyboard", async () => {
    renderTray({
      contextTray: [1, 2, 3, 4, 5].map(buildDatasetRef),
    });

    const addButton = screen.getByRole("button", { name: "Add context" });
    addButton.focus();
    expect(addButton).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "You can attach up to 5 items.",
    );
  });

  it("does not open the picker while the tray is full", async () => {
    renderTray({
      contextTray: [1, 2, 3, 4, 5].map(buildDatasetRef),
    });

    fireEvent.click(screen.getByRole("button", { name: "Add context" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", {
          name: "Search dashboards, datasets, maps...",
        }),
      ).not.toBeInTheDocument();
    });
  });
});
