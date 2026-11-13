import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  datasetName: string;
  pickedCount: number;
  removedCount: number;
  isAttaching: boolean;
  onBack: () => void;
  onAttach: () => void;
};

/**
 * Back to Unmatched values, and the button that attaches the picks. With
 * nothing picked but bindings to drop, the button says it removes them
 * instead.
 */
export function AttachFooter(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { datasetName } = props;
  const isRemovingOnly = props.pickedCount === 0 && props.removedCount > 0;
  return (
    <NewDictionaryFooter
      start={
        <Button variant="default" onClick={props.onBack}>
          <Trans>Back</Trans>
        </Button>
      }
    >
      <OfflineGated>
        <Button
          loading={props.isAttaching}
          disabled={props.pickedCount === 0 && props.removedCount === 0}
          onClick={props.onAttach}
        >
          {isRemovingOnly
            ? t`Remove dictionaries from ${datasetName}`
            : t`Attach to ${datasetName}`}
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
