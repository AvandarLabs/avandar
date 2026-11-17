import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";

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
  return (
    <Group justify="flex-end">
      <Button variant="default" disabled={isRunning} onClick={onCancel}>
        {t`Cancel`}
      </Button>
      <Button
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
