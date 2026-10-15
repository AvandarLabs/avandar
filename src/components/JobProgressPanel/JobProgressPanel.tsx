import { useSyncExternalStore } from "react";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { JobProgressIndicator } from "./JobProgressIndicator";
import css from "./JobProgressPanel.module.css";

/**
 * Floating panel holding one {@link JobProgressIndicator} per job live in
 * {@link JobProgressStore}. Renders nothing when no job is in flight.
 */
export function JobProgressPanel(): JSX.Element | null {
  useSyncExternalStore(
    JobProgressStore.subscribe,
    JobProgressStore.getSnapshot,
    JobProgressStore.getSnapshot,
  );
  const jobs = JobProgressStore.getAllJobs();

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className={css.jobProgressPanel}>
      {jobs.map(({ id, entry }) => {
        return <JobProgressIndicator key={id} id={id} entry={entry} />;
      })}
    </div>
  );
}
