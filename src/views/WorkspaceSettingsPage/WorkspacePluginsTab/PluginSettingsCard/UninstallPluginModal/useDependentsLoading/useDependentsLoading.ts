import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Tells the uninstall modal whether what reads one dataset is loading. */
export type ReportDependentsLoading = (
  datasetId: Dataset.Id,
  isLoading: boolean,
) => void;

/**
 * Carries `ReportDependentsLoading` from the uninstall modal down to the
 * rows that show what reads a checked dataset. Outside a modal it does
 * nothing, so a row can be rendered on its own.
 */
export const DependentsLoadingContext = createContext<ReportDependentsLoading>(
  () => {},
);

/**
 * Collects which checked datasets are still loading what reads them, so the
 * uninstall modal can keep its confirm button disabled until an admin can
 * see it. Provide `report` through `DependentsLoadingContext`.
 */
export function useDependentsLoadingTracker(): {
  isAnyLoading: boolean;
  report: ReportDependentsLoading;
} {
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<Dataset.Id>>(
    new Set(),
  );
  const report = useCallback<ReportDependentsLoading>(
    (datasetId, isLoading) => {
      setLoadingIds((previousIds) => {
        if (previousIds.has(datasetId) === isLoading) {
          return previousIds;
        }
        const updatedIds = new Set(previousIds);
        if (isLoading) {
          updatedIds.add(datasetId);
        } else {
          updatedIds.delete(datasetId);
        }
        return updatedIds;
      });
    },
    [],
  );
  return { isAnyLoading: loadingIds.size > 0, report };
}

/**
 * Reports to the uninstall modal whether what reads this dataset is loading,
 * and that it is not once the row goes away, for example when the admin
 * unchecks the dataset. It reports in a layout effect, so the modal waits
 * from the first render that shows the row and never for one frame enables a
 * confirm it should not.
 */
export function useReportDependentsLoading(
  options: Readonly<{ datasetId: Dataset.Id; isLoading: boolean }>,
): void {
  const { datasetId, isLoading } = options;
  const report = useContext(DependentsLoadingContext);
  useLayoutEffect(() => {
    report(datasetId, isLoading);
    return () => {
      report(datasetId, false);
    };
  }, [report, datasetId, isLoading]);
}
