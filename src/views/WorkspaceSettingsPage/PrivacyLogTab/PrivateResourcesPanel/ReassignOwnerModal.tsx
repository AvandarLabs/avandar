import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useReassignOwnerModal } from "./useReassignOwnerModal";

type Props = {
  /** The member whose resources are being reassigned. */
  fromUserId: string;
  onClose: () => void;
};

type ModalActionsProps = {
  isDisabled: boolean;
  isTransferring: boolean;
  onClose: () => void;
  onTransfer: () => void;
};

function _ModalActions({
  isDisabled,
  isTransferring,
  onClose,
  onTransfer,
}: Readonly<ModalActionsProps>): React.ReactNode {
  return (
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>
        <Trans>Cancel</Trans>
      </Button>
      <Button
        disabled={isDisabled}
        loading={isTransferring}
        onClick={onTransfer}
      >
        <Trans>Reassign</Trans>
      </Button>
    </Group>
  );
}

/** Picks a successor for all private resources owned by one member. */
export function ReassignOwnerModal({
  fromUserId,
  onClose,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const {
    isFetchingMembers,
    isTransferring,
    onChangeOwner,
    onTransfer,
    ownerOptions,
    toUserId,
  } = useReassignOwnerModal({ fromUserId, onClose });

  return (
    <Modal opened onClose={onClose} title={t`Reassign private resources`}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Trans>
            Choose who should own this member&rsquo;s private dashboards and
            datasets. You will not gain access to them.
          </Trans>
        </Text>
        <Select
          label={t`New owner`}
          data={ownerOptions}
          value={toUserId}
          onChange={onChangeOwner}
          disabled={isFetchingMembers}
          searchable
        />
        <_ModalActions
          isDisabled={!toUserId || isFetchingMembers}
          isTransferring={isTransferring}
          onClose={onClose}
          onTransfer={onTransfer}
        />
      </Stack>
    </Modal>
  );
}
