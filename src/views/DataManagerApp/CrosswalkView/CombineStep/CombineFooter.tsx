import { Trans } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { useId } from "react";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  label: string;
  /** Why the button is off, shown beside Back and as its description. */
  disabledReason: string | undefined;
  isDisabled: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
};

/** Back to Map each dataset, and the one button that creates or updates. */
export function CombineFooter(props: Readonly<Props>): ReactNode {
  const reasonId = useId();
  return (
    <NewDictionaryFooter
      start={
        <>
          <Button variant="default" onClick={props.onBack}>
            <Trans>Back</Trans>
          </Button>
          {props.disabledReason ? (
            <Text id={reasonId} size="sm" c="dimmed">
              {props.disabledReason}
            </Text>
          ) : null}
        </>
      }
    >
      <OfflineGated>
        <Button
          loading={props.isSaving}
          disabled={props.isDisabled}
          aria-describedby={props.disabledReason ? reasonId : undefined}
          onClick={props.onSave}
        >
          {props.label}
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
