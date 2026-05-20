import { BackgroundJobsList } from "@background-jobs/ui";
import { JSX } from "react";

/**
 * Body of the "Show background jobs" spotlight modal. The job list is
 * rendered by the `@avandar/background-jobs` library so the modal
 * itself stays a thin shim.
 */
export function BackgroundJobsView(): JSX.Element {
  return <BackgroundJobsList />;
}
