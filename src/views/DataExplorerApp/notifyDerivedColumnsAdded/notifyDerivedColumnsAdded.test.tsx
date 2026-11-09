import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
import { notifyDerivedColumnsAdded } from "@/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded";

const COLUMN_NAMES = ["incidence_per_100k", "incidence_per_100k_lower"];

function _renderNotification(onUndo: () => void = vi.fn()): void {
  render(<div />);
  act(() => {
    notifyDerivedColumnsAdded({ columnNames: COLUMN_NAMES, onUndo });
  });
}

describe("notifyDerivedColumnsAdded", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      notifications.clean();
    });
  });

  it("lists the added column names", async () => {
    _renderNotification();

    expect(
      await screen.findByText(
        "Added incidence_per_100k, incidence_per_100k_lower",
      ),
    ).toBeInTheDocument();
  });

  it("calls onUndo when Undo is clicked", async () => {
    const onUndo = vi.fn();
    _renderNotification(onUndo);

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("hides the notification when Undo is clicked", async () => {
    _renderNotification();

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.queryByText("Columns added")).not.toBeInTheDocument();
    });
  });

  it("replaces the notification of an earlier command", async () => {
    _renderNotification();
    await screen.findByText(
      "Added incidence_per_100k, incidence_per_100k_lower",
    );

    act(() => {
      notifyDerivedColumnsAdded({
        columnNames: ["cases_7d_avg"],
        onUndo: vi.fn(),
      });
    });

    expect(await screen.findByText("Added cases_7d_avg")).toBeInTheDocument();
    expect(screen.getAllByText("Columns added")).toHaveLength(1);
  });
});
