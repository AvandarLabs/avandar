import { t } from "@lingui/core/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

/**
 * Opens a confirmation before replacing a dashboard's custom URL.
 * Use it, for example, when an existing URL will become unreachable.
 * Calls onConfirm when the user confirms.
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
