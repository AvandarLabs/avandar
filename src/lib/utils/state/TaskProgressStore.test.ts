import { describe, expect, it } from "vitest";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore";

describe("TaskProgressStore", () => {
  it("starts a task in the indeterminate state with the given label", () => {
    const taskId = TaskProgressStore.startTask("Downloading model");

    expect(TaskProgressStore.getTask(taskId)).toEqual({
      status: "indeterminate",
      label: "Downloading model",
      detail: undefined,
    });

    TaskProgressStore.finishTask(taskId);
  });

  it("replaces a task's entry on update, including switching status", () => {
    const taskId = TaskProgressStore.startTask("Uploading dataset");

    TaskProgressStore.updateTask(taskId, {
      status: "determinate",
      label: "Uploading dataset",
      current: 3,
      total: 10,
    });

    expect(TaskProgressStore.getTask(taskId)).toEqual({
      status: "determinate",
      label: "Uploading dataset",
      current: 3,
      total: 10,
    });

    TaskProgressStore.finishTask(taskId);
  });

  it("does nothing when updating a task id that was already finished", () => {
    const taskId = TaskProgressStore.startTask("Uploading dataset");
    TaskProgressStore.finishTask(taskId);

    TaskProgressStore.updateTask(taskId, {
      status: "determinate",
      label: "Uploading dataset",
      current: 1,
      total: 1,
    });

    expect(TaskProgressStore.getTask(taskId)).toBeUndefined();
  });

  it("removes the entry entirely when a task finishes", () => {
    const taskId = TaskProgressStore.startTask("Downloading model");
    TaskProgressStore.finishTask(taskId);

    expect(TaskProgressStore.getTask(taskId)).toBeUndefined();
  });

  it("moves a task to the error state, keeping its label, when it fails", () => {
    const taskId = TaskProgressStore.startTask("Refreshing Facility records");

    TaskProgressStore.failTask(taskId, "Network error");

    expect(TaskProgressStore.getTask(taskId)).toEqual({
      status: "error",
      label: "Refreshing Facility records",
      message: "Network error",
    });

    TaskProgressStore.finishTask(taskId);
  });

  it("does nothing when failing a task id that was already finished", () => {
    const taskId = TaskProgressStore.startTask("Refreshing Facility records");
    TaskProgressStore.finishTask(taskId);

    TaskProgressStore.failTask(taskId, "Network error");

    expect(TaskProgressStore.getTask(taskId)).toBeUndefined();
  });

  it("gives two tasks started back to back distinct ids and independent state", () => {
    const firstTaskId = TaskProgressStore.startTask("First task");
    const secondTaskId = TaskProgressStore.startTask("Second task");

    expect(firstTaskId).not.toBe(secondTaskId);

    TaskProgressStore.updateTask(firstTaskId, {
      status: "determinate",
      label: "First task",
      current: 1,
      total: 2,
    });

    expect(TaskProgressStore.getTask(secondTaskId)).toEqual({
      status: "indeterminate",
      label: "Second task",
      detail: undefined,
    });

    TaskProgressStore.finishTask(firstTaskId);
    TaskProgressStore.finishTask(secondTaskId);
  });

  it("lists every live task from getAllTasks", () => {
    const taskId = TaskProgressStore.startTask("Downloading model");

    expect(TaskProgressStore.getAllTasks()).toEqual([
      {
        id: taskId,
        entry: {
          status: "indeterminate",
          label: "Downloading model",
          detail: undefined,
        },
      },
    ]);

    TaskProgressStore.finishTask(taskId);
  });
});
