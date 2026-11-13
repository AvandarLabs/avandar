import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ApplyDictionariesFlowView } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesFlowView";
import { useApplyAccess } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyAccess";
import { useApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  /** A dictionary to apply on its own, when the flow opened from one. */
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

function Loading(): ReactNode {
  return (
    <AppView>
      <Center flex={1}>
        <Loader size="sm" />
      </Center>
    </AppView>
  );
}

/**
 * Applies dictionaries to one dataset as reference: matches its columns to
 * dictionary entries, then attaches the picks without changing the data.
 * Only someone who can edit the dataset and read dictionaries gets in.
 */
export function ApplyDictionariesView({
  datasetId,
  preselectedDictionaryId,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const data = useApplyDictionariesData(datasetId);
  const access = useApplyAccess(data.dataset);
  if (data.hasLoadFailed || access === "failed") {
    return (
      <AppView>
        <Center flex={1} p="lg">
          <Callout
            maw={520}
            title={t`Dictionaries failed to load`}
            message={t`The dataset or its dictionaries failed to load. Please try again later or reach out to support.`}
          />
        </Center>
      </AppView>
    );
  }
  if (access !== "allowed" || !data.dataset) {
    return <Loading />;
  }
  return (
    <ApplyDictionariesFlowView
      dataset={data.dataset}
      data={data}
      preselectedDictionaryId={preselectedDictionaryId}
    />
  );
}
