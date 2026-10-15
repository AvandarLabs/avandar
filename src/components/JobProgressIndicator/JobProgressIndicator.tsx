import { useSyncExternalStore } from "react";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { JobPanel } from "./JobPanel";
import css from "./JobProgressIndicator.module.css";

/**
 * Floating stack of progress panels, one per job live in
 * {@link JobProgressStore}. Renders nothing when no job is in flight.
 */
export function JobProgressIndicator(): JSX.Element | null {
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
    <div className={css.jobProgressIndicator}>
      {jobs.map(({ id, entry }) => {
        return <JobPanel key={id} id={id} entry={entry} />;
      })}
    </div>
  );
}
