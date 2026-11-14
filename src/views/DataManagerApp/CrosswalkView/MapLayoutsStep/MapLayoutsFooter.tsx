import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  layout: CrosswalkDraft.Layout;
  hasSuggestions: boolean;
  isSaving: boolean;
  onSkip: () => void;
  onReopen: () => void;
  onAcceptAll: () => void;
  onConfirm: () => void;
  /** Suggest matches, rendered before Accept all suggestions. */
  suggestMatches?: ReactNode;
};

function SkipButton(props: Readonly<Props>): ReactNode {
  if (props.layout.isReference) {
    return null;
  }
  return (
    <OfflineGated>
      <Button
        variant="subtle"
        color="neutral"
        disabled={props.isSaving}
        onClick={props.onSkip}
      >
        <Trans>Skip this dataset</Trans>
      </Button>
    </OfflineGated>
  );
}

/**
 * Step 2's action bar for the shown layout: Skip this dataset (never for
 * the reference layout), Suggest matches when the step passes it, Accept
 * all suggestions while any are left, and Confirm and next. A skipped
 * layout offers only Map this dataset.
 */
export function MapLayoutsFooter(props: Readonly<Props>): ReactNode {
  if (props.layout.status === "skipped") {
    return (
      <NewDictionaryFooter>
        <OfflineGated>
          <Button loading={props.isSaving} onClick={props.onReopen}>
            <Trans>Map this dataset</Trans>
          </Button>
        </OfflineGated>
      </NewDictionaryFooter>
    );
  }
  return (
    <NewDictionaryFooter start={<SkipButton {...props} />}>
      {props.suggestMatches}
      <OfflineGated>
        <Button
          variant="default"
          disabled={!props.hasSuggestions || props.isSaving}
          onClick={props.onAcceptAll}
        >
          <Trans>Accept all suggestions</Trans>
        </Button>
      </OfflineGated>
      <OfflineGated>
        <Button loading={props.isSaving} onClick={props.onConfirm}>
          <Trans>Confirm and next</Trans>
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
