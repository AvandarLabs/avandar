import { useSyncExternalStore } from "react";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import { TaskPanel } from "./TaskPanel";
import css from "./TaskProgressIndicator.module.css";

/**
 * Floating stack of progress panels, one per task live in
 * {@link TaskProgressStore}. Renders nothing when no task is in flight.
 */
export function TaskProgressIndicator(): JSX.Element | null {
  useSyncExternalStore(
    TaskProgressStore.subscribe,
    TaskProgressStore.getSnapshot,
    TaskProgressStore.getSnapshot,
  );
  const tasks = TaskProgressStore.getAllTasks();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className={css.taskProgressIndicator}>
      {tasks.map(({ id, entry }) => {
        return <TaskPanel key={id} id={id} entry={entry} />;
      })}
    </div>
  );
}
