import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";

type Props = Readonly<{
  /** The confirm button's text, which names how many datasets it deletes. */
  confirmLabel: string;
  isRunning: boolean;

  /** Whether the datasets are still loading, so the choice is not final. */
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

/**
 * The Cancel and confirm buttons of the uninstall modal. Both stay disabled
 * while the uninstall runs, and the confirm button also waits for the dataset
 * list so an admin never confirms before seeing what is kept.
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
