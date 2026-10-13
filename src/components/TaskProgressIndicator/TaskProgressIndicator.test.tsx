import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { afterEach, describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import { render, screen } from "@/test-utils";
import { TaskProgressIndicator } from "./TaskProgressIndicator";

function _renderIndicator(): void {
  render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <TaskProgressIndicator />
      </AvandarAppProvider>
    </I18nProvider>,
  );
}

describe("TaskProgressIndicator", () => {
  afterEach(() => {
    TaskProgressStore.getAllTasks().forEach(({ id }) => {
      TaskProgressStore.finishTask(id);
    });
  });

  it("renders nothing when no task is live", () => {
    _renderIndicator();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders one panel per live task, each labeled", () => {
    TaskProgressStore.startTask("Refreshing Facility records");
    TaskProgressStore.startTask("Uploading dataset");

    _renderIndicator();

    expect(
      screen.getByText("Refreshing Facility records"),
    ).toBeInTheDocument();
    expect(screen.getByText("Uploading dataset")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("shows a determinate progress bar with the task's current/total", () => {
    const taskId = TaskProgressStore.startTask("Refreshing Facility records");
    TaskProgressStore.updateTask(taskId, {
      status: "determinate",
      label: "Refreshing Facility records",
      current: 2,
      total: 4,
    });

    _renderIndicator();

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("shows a dismissible error panel for a failed task", () => {
    const taskId = TaskProgressStore.startTask("Uploading dataset");
    TaskProgressStore.failTask(taskId, "Network error");

    _renderIndicator();

    expect(screen.getByText("Network error")).toBeInTheDocument();
    screen.getByRole("button", { name: /dismiss/i }).click();

    expect(TaskProgressStore.getTask(taskId)).toBeUndefined();
  });
});
