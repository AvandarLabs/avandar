import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { notifyDatasetAdded } from "@/views/DataManagerApp/DataImportView/DataCatalogView/notifyDatasetAdded/notifyDatasetAdded";
import type { ReactElement } from "react";

function _lastNotification(): {
  title: string;
  message: ReactElement | string;
} {
  const show = vi.mocked(notifications.show);
  return show.mock.calls.at(-1)![0] as never;
}

describe("notifyDatasetAdded", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("says the dataset was added, with nothing more when nothing is recommended", () => {
    vi.spyOn(notifications, "show").mockReturnValue("dataset-added");

    notifyDatasetAdded({
      title: "Dataset added",
      message: '"Measles" is now in your workspace.',
      recommendation: undefined,
    });

    expect(_lastNotification()).toMatchObject({
      title: "Dataset added",
      message: '"Measles" is now in your workspace.',
    });
  });

  it("names the recommended datasets and adds them all from its button", () => {
    vi.spyOn(notifications, "show").mockReturnValue("dataset-added");
    vi.spyOn(notifications, "hide").mockReturnValue("dataset-added");
    const onAddAll = vi.fn();

    notifyDatasetAdded({
      title: "Dataset added",
      message: '"Measles" is now in your workspace.',
      recommendation: {
        message: "Recommended with it: Country, Sex",
        action: "Add them too",
        onAddAll,
      },
    });
    render(_lastNotification().message as ReactElement);
    fireEvent.click(screen.getByRole("button", { name: "Add them too" }));

    expect([
      screen.getByText("Recommended with it: Country, Sex"),
      onAddAll.mock.calls.length,
      vi.mocked(notifications.hide).mock.calls.length,
    ]).toEqual([expect.anything(), 1, 1]);
  });
});
