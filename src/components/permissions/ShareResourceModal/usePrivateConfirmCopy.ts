import { isDefined } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";

/** User-visible copy rendered by the Make private confirmation. */
export type PrivateConfirmCopy = {
  title: string;
  body: string;
  confirmLabel: string;
};

/** Values interpolated into the Make private confirmation copy. */
export type PrivateConfirmCopyOptions = {
  resourceName: string;
  numUsers: number;
  numGroups: number;
  losesWorkspaceAccess: boolean;
  app: string;
};

/** Returns localized copy for the Make private confirmation. */
export function usePrivateConfirmCopy(): (
  options: Readonly<PrivateConfirmCopyOptions>,
) => PrivateConfirmCopy {
  const { t } = useLingui();
  return ({
    resourceName,
    numUsers,
    numGroups,
    losesWorkspaceAccess,
    app,
  }): PrivateConfirmCopy => {
    const peopleClause =
      numUsers === 0 ? undefined
      : numUsers === 1 ? t`1 person`
      : t`${numUsers} people`;
    const groupClause =
      numGroups === 0 ? undefined
      : numGroups === 1 ? t`1 group`
      : t`${numGroups} groups`;
    const shareClause =
      isDefined(peopleClause) && isDefined(groupClause) ?
        t`${peopleClause} and ${groupClause}`
      : (peopleClause ?? groupClause);
    const sentences = [
      isDefined(shareClause) ? t`${shareClause} will lose access.` : undefined,
      losesWorkspaceAccess ?
        t`Everyone in ${app} will lose access.`
      : undefined,
      t`Only you will be able to open it. You can share it again at any time.`,
    ].filter(isDefined);

    return {
      title: t`Make "${resourceName}" private?`,
      body: sentences.join(" "),
      confirmLabel: t`Make private`,
    };
  };
}
