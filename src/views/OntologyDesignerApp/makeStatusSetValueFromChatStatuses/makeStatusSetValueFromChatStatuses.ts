import { uuid } from "$/lib/uuid";
import { makeDefaultStatusDrafts } from "@/views/OntologyDesignerApp/makeDefaultStatusDrafts/makeDefaultStatusDrafts";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ChatCaseStatus } from "$/types/chat.types";

/**
 * Builds an editable status set from the statuses chat proposed for a case
 * type, or the translated default set when chat proposed none.
 *
 * Chat names the default rather than pointing at an id, so it is matched by
 * name, ignoring case and surrounding spaces. A name that matches nothing
 * falls back to the first status, because a status set always has a default.
 */
export function makeStatusSetValueFromChatStatuses(
  options: Readonly<{
    statuses?: readonly ChatCaseStatus[];
    defaultStatusName?: string;
  }>,
): ConceptStatus.SetValue & { defaultStatusId: ConceptStatus.Id } {
  const drafts = (options.statuses ?? []).map((status): ConceptStatus.Draft => {
    return {
      id: uuid<ConceptStatus.Id>(),
      name: status.name,
      description: status.description,
      color: status.color,
    };
  });
  const [firstDraft] = drafts;
  if (!firstDraft) {
    return makeDefaultStatusDrafts();
  }
  const requestedDefaultName = options.defaultStatusName?.trim().toLowerCase();
  const defaultDraft =
    drafts.find((draft) => {
      return draft.name.trim().toLowerCase() === requestedDefaultName;
    }) ?? firstDraft;
  return { statuses: drafts, defaultStatusId: defaultDraft.id };
}
