import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";

type Options = {
  value: ConceptStatus.SetValue;
  savedStatuses: readonly ConceptStatus.T[];
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  replacements: StatusReplacements;
};

type StatusSetIssueMessages = {
  /** Problems that belong to one status, keyed by that status. */
  byStatusId: Partial<Record<ConceptStatus.Id, string>>;

  /** Problems with the set as a whole. */
  forSet: string[];
};

/**
 * Every problem `ConceptStatus.findSetIssues` finds in a status set, as
 * translated copy placed where the user can fix it: beside the status it
 * belongs to, or under the list for problems with the whole set.
 *
 * @returns Messages keyed by status, and messages about the whole set.
 */
export function useStatusSetIssueMessages(
  options: Readonly<Options>,
): StatusSetIssueMessages {
  const { t } = useLingui();
  const issues = ConceptStatus.findSetIssues({
    value: options.value,
    recordCounts: options.recordCounts,
    savedStatusIds: options.savedStatuses.map(prop("id")),
    replacements: options.replacements,
  });
  const byStatusId: Partial<Record<ConceptStatus.Id, string>> = {};
  const forSet: string[] = [];

  issues.forEach((issue) => {
    match(issue)
      .with({ type: "empty_set" }, () => {
        forSet.push(t`Add at least one status.`);
      })
      .with({ type: "default_required" }, () => {
        forSet.push(t`Choose a default status.`);
      })
      .with({ type: "name_required" }, ({ statusId }) => {
        byStatusId[statusId] = t`Enter a name.`;
      })
      .with({ type: "name_not_unique" }, ({ statusId }) => {
        byStatusId[statusId] = t`Another status has this name.`;
      })
      .with({ type: "replacement_required" }, ({ statusId }) => {
        byStatusId[statusId] = t`Choose a status for these records.`;
      })
      .exhaustive();
  });

  return { byStatusId, forSet };
}
