import { useDisclosure } from "@mantine/hooks";
import { match } from "ts-pattern";
import { OfflineModeBusyButton } from "./OfflineModeBusyButton";
import css from "./OfflineModeControl.module.css";
import { OfflineModeDialog } from "./OfflineModeDialog";
import { OfflineModeSetupButton } from "./OfflineModeSetupButton";
import { OfflineModeToggle } from "./OfflineModeToggle";
import { useOfflineModeControlState } from "./useOfflineModeControlState";
import { useOfflineModelActions } from "./useOfflineModelActions";
import type { OfflineModeControlState } from "./useOfflineModeControlState";
import type { ReactNode } from "react";

type Props = {
  disabled?: boolean;
};

function _OfflineModeTrigger(
  props: Readonly<{
    state: OfflineModeControlState;
    disabled: boolean;
    onOpenDialog: () => void;
  }>,
): ReactNode {
  const { state, disabled, onOpenDialog } = props;
  return match(state)
    .with({ kind: "downloading" }, ({ progress }) => {
      return <OfflineModeBusyButton downloadProgress={progress} />;
    })
    .with({ kind: "removing" }, () => {
      return <OfflineModeBusyButton />;
    })
    .with({ kind: "ready" }, ({ isOn, isBrowserOffline }) => {
      return (
        <OfflineModeToggle
          isOn={isOn}
          isBrowserOffline={isBrowserOffline}
          disabled={disabled}
          onOpenDialog={onOpenDialog}
        />
      );
    })
    .with({ kind: "unsupported" }, { kind: "not_downloaded" }, ({ kind }) => {
      return (
        <OfflineModeSetupButton
          isUnsupported={kind === "unsupported"}
          disabled={disabled}
          onOpenDialog={onOpenDialog}
        />
      );
    })
    .exhaustive();
}

/**
 * The chat composer's one model control: offline mode. Before the offline
 * models are downloaded it opens a dialog that explains offline mode and
 * downloads them; while they download it shows progress; afterwards it
 * toggles offline mode and opens the dialog to remove them. Avandar chooses
 * every model itself, so there is nothing else to pick.
 */
export function OfflineModeControl({
  disabled = false,
}: Readonly<Props>): ReactNode {
  const state = useOfflineModeControlState();
  const { onDownload, onRemove, isRemoving } = useOfflineModelActions();
  const [isDialogOpen, dialog] = useDisclosure(false);
  return (
    <div className={css.offlineModeControl}>
      <_OfflineModeTrigger
        state={state}
        disabled={disabled}
        onOpenDialog={dialog.open}
      />
      <OfflineModeDialog
        isOpen={isDialogOpen}
        isDownloaded={state.kind === "ready" || state.kind === "removing"}
        isRemoving={isRemoving}
        onClose={dialog.close}
        onDownload={() => {
          dialog.close();
          void onDownload();
        }}
        onRemove={() => {
          void onRemove().then(dialog.close);
        }}
      />
    </div>
  );
}
