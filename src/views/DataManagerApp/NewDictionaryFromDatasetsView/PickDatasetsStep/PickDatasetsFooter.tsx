import { Plural, Trans } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  pickedCount: number;
  isReading: boolean;
  onRead: () => void;
};

/**
 * Under the Pick step: what reading covers, since suggestions may send some
 * of it to a model, and the button that reads the picked datasets.
 */
export function PickDatasetsFooter({
  pickedCount,
  isReading,
  onRead,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Text size="sm" c="dimmed">
          <Trans>
            Only column names and the distinct values of short columns are read.
            Rows never leave this device for suggestions.
          </Trans>
        </Text>
      }
    >
      <Button onClick={onRead} loading={isReading} disabled={pickedCount === 0}>
        <Plural
          value={pickedCount}
          one="Read # dataset"
          other="Read # datasets"
        />
      </Button>
    </NewDictionaryFooter>
  );
}
