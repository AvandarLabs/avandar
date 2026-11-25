import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  label: string;
  isDisabled: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
};

/** Back to Unmatched values, and the one button that saves. */
export function SaveFooter(props: Readonly<Props>): ReactNode {
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
          loading={props.isSaving}
          disabled={props.isDisabled}
          onClick={props.onSave}
        >
          {props.label}
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
