import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DictionaryUsageCrosswalk } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  crosswalk: DictionaryUsageCrosswalk;
};

/**
 * Opens a crosswalk on its Create combined dataset step, where its editor
 * updates the combined dataset with the current code lists. Its
 * accessible name names the crosswalk, since several rows can carry one.
 */
export function OpenCrosswalkLink({ crosswalk }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const crosswalkName = crosswalk.name;
  const link = AppLinks.dataManagerCrosswalkView({
    workspaceSlug: workspace.slug,
    crosswalkId: crosswalk.id,
    crosswalkName,
    step: "combine",
  });
  return (
    <Link
      to={link.to}
      params={link.params}
      search={link.search}
      size="xs"
      fw={500}
      aria-label={t`Open crosswalk ${crosswalkName}`}
    >
      <Trans>Open crosswalk</Trans>
    </Link>
  );
}
