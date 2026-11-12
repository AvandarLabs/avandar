import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { NewDictionaryFlowView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFlowView";
import { NewDictionaryNoAccess } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryNoAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset whose menu opened the flow, which skips Pick datasets. */
  originDatasetId: Dataset.Id | undefined;
};

/**
 * Learning a dictionary from datasets, in four steps: Pick datasets, Review
 * columns, Label values, and Save. Opened from the Data Sources toolbar's
 * New dictionary menu, or from a dataset's menu. Only someone who can edit
 * dictionaries gets the flow, so nothing is read before that is checked. A
 * loader shows while the roles load, so editors never see the no-access notice.
 */
export function NewDictionaryFromDatasetsView({
  originDatasetId,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [, areRolesLoading] = useUserAppRoles();
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  if (areRolesLoading) {
    return (
      <AppView>
        <Center flex={1} p="lg">
          <Loader
            size="sm"
            role="status"
            aria-label={t`Checking your access`}
          />
        </Center>
      </AppView>
    );
  }
  return canEditDictionaries ? (
    <NewDictionaryFlowView originDatasetId={originDatasetId} />
  ) : (
    <NewDictionaryNoAccess />
  );
}
