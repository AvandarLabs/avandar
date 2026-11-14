import { Plural, Trans } from "@lingui/react/macro";
import { List, Stack, Text } from "@mantine/core";
import type { LinkedDataset } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
import type { ReactNode } from "react";

type Props = {
  datasetName: string;
  linkedDatasets: readonly LinkedDataset[];
};

/**
 * What the delete confirmation says: the question, then every linked
 * dataset that reads this one and stops working once it is gone.
 */
export function DeleteDatasetConfirmBody({
  datasetName,
  linkedDatasets,
}: Readonly<Props>): ReactNode {
  const linkedCount = linkedDatasets.length;
  return (
    <Stack gap="xs">
      <Text>
        <Trans>Are you sure you want to delete {datasetName}?</Trans>
      </Text>
      {linkedCount > 0 ? (
        <>
          <Text size="sm">
            <Plural
              value={linkedCount}
              one="This linked dataset reads it and stops working once it is deleted:"
              other="These # linked datasets read it and stop working once it is deleted:"
            />
          </Text>
          <List size="sm">
            {linkedDatasets.map((linkedDataset) => {
              return (
                <List.Item key={linkedDataset.id}>
                  {linkedDataset.name}
                </List.Item>
              );
            })}
          </List>
        </>
      ) : null}
    </Stack>
  );
}
