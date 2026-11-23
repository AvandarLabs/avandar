import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * The create form's statuses as a status set value.
 *
 * The form keeps its last default when every status is removed, because its
 * `defaultStatusId` cannot be empty. A default that no longer names a status
 * is dropped here, so the editor and the form's validation both see a set
 * with no default.
 *
 * @param values The form's `statuses` and `defaultStatusId`.
 * @returns The set value the status set editor edits.
 */
export function getStatusSetValueFromFormValues(
  values: Readonly<{
    statuses: readonly ConceptStatus.Draft[];
    defaultStatusId: ConceptStatus.Id | undefined;
  }>,
): ConceptStatus.SetValue {
  const { statuses, defaultStatusId } = values;
  const hasDefault = statuses.some((status) => {
    return status.id === defaultStatusId;
  });
  return {
    statuses,
    defaultStatusId: hasDefault ? defaultStatusId : undefined,
  };
}
