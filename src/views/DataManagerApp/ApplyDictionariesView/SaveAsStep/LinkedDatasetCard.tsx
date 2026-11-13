import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Radio, Stack, Text } from "@mantine/core";
import { useId } from "react";
import css from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveAsStep.module.css";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ReactNode } from "react";

type Props = {
  datasetName: string;
  linked: ApplyTargets["linked"];
};

function useDescription(
  datasetName: string,
  linked: ApplyTargets["linked"],
): string {
  const { t } = useLingui();
  if (linked.isAvailable) {
    return t`A new dataset that reads ${datasetName} and converts its values as it loads. Later edits to the dictionaries show up in it right away.`;
  }
  switch (linked.reason) {
    case "not_admin":
      return t`Only workspace admins can add datasets, so you can't create a linked dataset.`;
    case "dataset_limit":
      return t`Your plan's dataset limit is reached, so a linked dataset can't be added.`;
    case "already_linked":
      return t`${datasetName} is already a linked dataset, so its conversions stay live.`;
  }
}

/**
 * The Create a new linked dataset card: named by its title, described by
 * what it does, or by why it is unavailable.
 */
export function LinkedDatasetCard({
  datasetName,
  linked,
}: Readonly<Props>): ReactNode {
  const titleId = useId();
  const descriptionId = useId();
  const description = useDescription(datasetName, linked);
  return (
    <Radio.Card
      value="linked"
      disabled={!linked.isAvailable}
      className={css.saveTargetCard}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <Radio.Indicator disabled={!linked.isAvailable} />
        <Stack gap={2}>
          <Text id={titleId} fw={600} size="sm">
            <Trans>Create a new linked dataset</Trans>
          </Text>
          <Text id={descriptionId} size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>
    </Radio.Card>
  );
}
