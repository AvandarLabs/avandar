import { Modal, Stack, Text, Title } from "@mantine/core";
import { SaveToDashboardCreateMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardCreateMode";
import { getCreateModalStyles } from "./getCreateModalStyles";
import { useCreateModalTargets } from "./useCreateModalTargets";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
const _noop = () => {};
/**
 * The real "Save to dashboard" create form, typed out letter-by-letter from the
 * dashboard's default name.
 */
export function CreateModal({ frame }: Readonly<Props>): ReactNode {
  const { rootRef, name } = useCreateModalTargets({ frame });

  return (
    <Modal
      opened
      onClose={_noop}
      size="lg"
      withinPortal={false}
      transitionProps={{ duration: 0 }}
      styles={getCreateModalStyles({ frame })}
    >
      <Stack gap="md" ref={rootRef}>
        <Stack gap={2}>
          <Title order={4}>Save to dashboard</Title>
          <Text c="dimmed" size="sm">
            We'll add this visualization to your new dashboard.
          </Text>
        </Stack>
        <SaveToDashboardCreateMode
          key={name}
          defaultName={name}
          isCreating={frame >= 306}
          isDisabled={false}
          showEmptyStateBanner={false}
          onBack={undefined}
          onCancel={_noop}
          onSubmit={_noop}
        />
      </Stack>
    </Modal>
  );
}
