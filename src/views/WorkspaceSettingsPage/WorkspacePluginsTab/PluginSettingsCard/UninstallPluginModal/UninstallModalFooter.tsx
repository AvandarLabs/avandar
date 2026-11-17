import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type Props = Readonly<{
  /** The confirm button's text, which names how many datasets it deletes. */
  confirmLabel: string;
  isRunning: boolean;

  /**
   * Whether the datasets, or what reads a checked one, are still loading, so
   * the choice is not final.
   */
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

/**
 * Puts focus back on the confirm button when a run ends and focus fell to the
 * page, which is what a button disabled while it was focused leaves behind.
 * A modal that closes afterwards takes the button with it, which is harmless.
 */
function useRestoreFocusAfterRun(
  isRunning: boolean,
): RefObject<HTMLButtonElement | null> {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasRunningRef = useRef(false);
  useEffect(() => {
    const hasJustFinished = wasRunningRef.current && !isRunning;
    wasRunningRef.current = isRunning;
    if (hasJustFinished && document.activeElement === document.body) {
      confirmRef.current?.focus();
    }
  }, [isRunning]);
  return confirmRef;
}

/**
 * The Cancel and confirm buttons of the uninstall modal. Both stay disabled
 * while the uninstall runs, and the confirm button also waits for the dataset
 * list and for what reads each checked dataset, so an admin never confirms
 * before seeing what is kept and what stops working.
 */
export function UninstallModalFooter({
  confirmLabel,
  isRunning,
  isLoading,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const { t } = useLingui();
  const confirmRef = useRestoreFocusAfterRun(isRunning);
  return (
    <Group justify="flex-end">
      <Button variant="default" disabled={isRunning} onClick={onCancel}>
        {t`Cancel`}
      </Button>
      <Button
        ref={confirmRef}
        color="danger"
        loading={isRunning}
        disabled={isLoading}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </Group>
  );
}
