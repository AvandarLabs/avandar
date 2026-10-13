import { uuid } from "$/lib/uuid";
import { createExternalStore } from "@/lib/utils/state/createExternalStore";
import type { UUID } from "@avandar/utils";

/** Identifies one live entry in {@link TaskProgressStore}. */
export type TaskId = UUID<"Task">;

/** The progress state of one task tracked by {@link TaskProgressStore}. */
export type TaskEntry =
  | { status: "indeterminate"; label: string; detail?: string }
  | {
      status: "determinate";
      label: string;
      current: number;
      total: number;
      detail?: string;
    }
  | { status: "error"; label: string; message: string };

/**
 * Shared store for every long-running background task that reports progress
 * to the floating task-progress indicator: offline-model downloads, dataset
 * uploads, and concept record syncs. Keyed by an opaque task id so any
 * number of tasks can be in flight at once.
 */
export const TaskProgressStore = createExternalStore({
  initialState: new Map<TaskId, TaskEntry>(),
  builder: (tasks: Map<TaskId, TaskEntry>) => {
    return {
      getters: {
        /** The current entry for one task, or undefined if it isn't live. */
        getTask: (taskId: TaskId): TaskEntry | undefined => {
          return tasks.get(taskId);
        },

        /** Every live task, for rendering the floating indicator. */
        getAllTasks: (): Array<{ id: TaskId; entry: TaskEntry }> => {
          return [...tasks.entries()].map(([id, entry]) => {
            return { id, entry };
          });
        },
      },
      updaters: {
        /**
         * Registers a new task in the indeterminate state and returns its
         * id.
         */
        startTask: (label: string, options?: { detail?: string }): TaskId => {
          const taskId = uuid<"Task">();
          tasks.set(taskId, {
            status: "indeterminate",
            label,
            detail: options?.detail,
          });
          return taskId;
        },

        /**
         * Replaces a task's entry wholesale, e.g. to switch it from
         * indeterminate to determinate. No-ops if the task already finished.
         */
        updateTask: (taskId: TaskId, entry: TaskEntry): void => {
          if (!tasks.has(taskId)) {
            return;
          }
          tasks.set(taskId, entry);
        },

        /**
         * Removes a task. Called on success, and by the user dismissing an
         * error.
         */
        finishTask: (taskId: TaskId): void => {
          tasks.delete(taskId);
        },

        /** Moves a task to the error state, keeping its last known label. */
        failTask: (taskId: TaskId, message: string): void => {
          const existingEntry = tasks.get(taskId);
          tasks.set(taskId, {
            status: "error",
            label: existingEntry?.label ?? "",
            message,
          });
        },
      },
    };
  },
});
