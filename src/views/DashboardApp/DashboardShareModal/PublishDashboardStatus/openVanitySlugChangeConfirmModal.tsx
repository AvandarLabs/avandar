import { t } from "@lingui/core/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

/**
 * Warns that replacing a live vanity path retires the previous URL.
 */
export function openVanitySlugChangeConfirmModal(
  options: Readonly<{ onConfirm: () => void }>,
): void {
  modals.openConfirmModal({
    title: t`Change custom URL?`,
    children: (
      <Text size="sm">
        {t`The previous URL will become invalid and unreachable. Anyone using the old link will no longer be able to reach this dashboard.`}
      </Text>
    ),
    labels: { confirm: t`Replace URL`, cancel: t`Cancel` },
    confirmProps: { color: "danger" },
    onConfirm: options.onConfirm,
  });
}
