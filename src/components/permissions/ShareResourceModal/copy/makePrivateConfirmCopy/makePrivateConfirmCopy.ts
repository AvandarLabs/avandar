import { isDefined } from "@avandar/utils";
import { t } from "@lingui/core/macro";

/** User-visible copy rendered by the Make private confirmation. */
export type MakePrivateConfirmCopy = {
  title: string;
  body: string;
  confirmLabel: string;
};

/** Values interpolated into the Make private confirmation copy. */
export type MakePrivateConfirmCopyOptions = {
  resourceName: string;
  numUsers: number;
  numGroups: number;
  losesWorkspaceAccess: boolean;
  app: string;
  /**
   * Whether the resource is currently publicly published. Revoking shares
   * never touches publication, so a public resource stays world-readable
   * until it is explicitly unpublished; the confirmation has to say so.
   */
  isPubliclyPublished: boolean;
};

/**
 * Builds the localized copy for the Make private confirmation.
 *
 * Lives here rather than inline because `openMakePrivateConfirmModal` calls
 * `modals.openConfirmModal` imperatively from an event handler. There is no
 * component to render `<Trans>` into, so the strings have to be assembled
 * ahead of the call. The body is also a sentence assembled from up to three
 * clauses that vary by how many principals lose access, which is real logic
 * rather than a literal.
 */
export function makePrivateConfirmCopy({
  resourceName,
  numUsers,
  numGroups,
  losesWorkspaceAccess,
  app,
  isPubliclyPublished,
}: Readonly<MakePrivateConfirmCopyOptions>): MakePrivateConfirmCopy {
  const peopleClause =
    numUsers === 0
      ? undefined
      : numUsers === 1
        ? t`1 person`
        : t`${numUsers} people`;
  const groupClause =
    numGroups === 0
      ? undefined
      : numGroups === 1
        ? t`1 group`
        : t`${numGroups} groups`;
  const shareClause =
    isDefined(peopleClause) && isDefined(groupClause)
      ? t`${peopleClause} and ${groupClause}`
      : (peopleClause ?? groupClause);
  const sentences = [
    isDefined(shareClause) ? t`${shareClause} will lose access.` : undefined,
    losesWorkspaceAccess ? t`Everyone in ${app} will lose access.` : undefined,
    // The publication warning comes BEFORE the exclusivity sentence, and the
    // exclusivity sentence narrows itself to signed-in people when it applies.
    // Revoking shares does not unpublish, so "only you will be able to open
    // it" is simply false for a public resource, and stating it first would
    // make the true sentence read as a correction of the one above it.
    isPubliclyPublished
      ? t`"${resourceName}" will still be public: anyone with the link keeps access until you unpublish it.`
      : undefined,
    isPubliclyPublished
      ? t`Among signed-in people, only you will be able to open it. You can share it again at any time.`
      : t`Only you will be able to open it. You can share it again at any time.`,
  ].filter(isDefined);

  return {
    title: t`Make "${resourceName}" private?`,
    body: sentences.join(" "),
    confirmLabel: t`Make private`,
  };
}
