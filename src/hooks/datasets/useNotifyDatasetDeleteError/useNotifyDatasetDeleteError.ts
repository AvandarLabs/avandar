import { useAvaQueryErrorReporter } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { notifyError } from "@/utils/notifications/notify";

/**
 * Returns an `onError` handler for a dataset delete mutation, such as the one
 * behind a Delete Dataset menu item. A `DatasetDeleteError` becomes a
 * translated notification chosen by its `reason`. Any other error goes to
 * `onOtherError` when given, and otherwise to the app's error reporter with
 * the generic message, which is what a mutation does when it has no `onError`.
 */
export function useNotifyDatasetDeleteError(
  options: Readonly<{ onOtherError?: (error: Error) => void }> = {},
): (error: Error) => void {
  const { t } = useLingui();
  const reportError = useAvaQueryErrorReporter();
  const { onOtherError } = options;

  return (error) => {
    if (error instanceof DatasetDeleteError) {
      notifyError({
        title: t`Dataset not deleted`,
        message:
          error.reason === "not_allowed"
            ? t`You don't have permission to delete this dataset.`
            : t`The dataset could not be deleted. Try again.`,
      });
      return;
    }
    if (onOtherError) {
      onOtherError(error);
      return;
    }
    reportError({
      title: t`An unexpected error occurred`,
      message: t`Please contact support for assistance.`,
      cause: error,
    });
  };
}
