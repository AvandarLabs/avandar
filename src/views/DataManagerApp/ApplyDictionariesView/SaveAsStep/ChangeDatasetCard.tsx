import { useLingui } from "@lingui/react/macro";
import { Group, Radio, Stack, Text } from "@mantine/core";
import { useId } from "react";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import css from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveAsStep.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  inPlace: ApplyTargets["inPlace"];
};

/** What changing in place does, or why it is not possible here. */
function useDescription(
  dataset: Dataset.T,
  inPlace: ApplyTargets["inPlace"],
): string {
  const { t } = useLingui();
  const sourceLabels = useDatasetSourceLabels();
  const datasetName = dataset.name;
  const sourceName = sourceLabels[dataset.sourceType];
  if (inPlace.isAvailable) {
    return inPlace.storage === "synced"
      ? t`Rewrites the uploaded data in place. It is synced to the workspace, so this changes it for everyone who uses it.`
      : t`It is offline only, so nobody else is affected.`;
  }
  if (inPlace.reason === "has_linked_datasets") {
    return t`A linked dataset reads ${datasetName}, so it can't be changed in place. Convert in the linked dataset instead.`;
  }
  return dataset.sourceType === "virtual"
    ? t`${datasetName} is built from other data, so a linked dataset is the only option.`
    : t`${sourceName} data can't be changed from Avandar yet, so a linked dataset is the only option for now.`;
}

/**
 * The Change <dataset> card: converts the dataset itself, pinned to the
 * dictionary versions applied. Its copy depends on where the data lives,
 * and it is disabled, saying why, where changing in place is not possible.
 */
export function ChangeDatasetCard({
  dataset,
  inPlace,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const titleId = useId();
  const descriptionId = useId();
  const description = useDescription(dataset, inPlace);
  const datasetName = dataset.name;
  return (
    <Radio.Card
      value="in_place"
      disabled={!inPlace.isAvailable}
      className={css.saveTargetCard}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <Radio.Indicator disabled={!inPlace.isAvailable} />
        <Stack gap={2}>
          <Text id={titleId} fw={600} size="sm">
            {t`Change ${datasetName}`}
          </Text>
          <Text id={descriptionId} size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>
    </Radio.Card>
  );
}
