import { useLingui } from "@lingui/react/macro";
import { PlacesNotEditableError } from "@/clients/places/PlacesNotEditableError";

/**
 * Returns a function that turns a failed places action into the message the
 * user sees: reason-specific copy when the dataset cannot be edited as
 * places, otherwise the caller's already translated `fallbackMessage`. Used
 * only by `usePlacesActions`.
 */
export function usePlacesErrorMessage(): (
  error: unknown,
  fallbackMessage: string,
) => string {
  const { t } = useLingui();
  return (error, fallbackMessage) => {
    if (!(error instanceof PlacesNotEditableError)) {
      return fallbackMessage;
    }
    return error.reason === "not_places_dataset"
      ? t`This dataset isn't a places dataset, so places can't be added to it.`
      : t`This places dataset was changed outside the map and can no longer be edited here.`;
  };
}
