import { Plural, Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import css from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar.module.css";
import type { ReactNode } from "react";

type Props = {
  issueCount: number;
  isSaving: boolean;
  /** Why the last save failed, shown until the next save. */
  saveErrorMessage: string | undefined;
  onDiscard: () => void;
  onSave: () => void;
};

/**
 * The bar that appears while a dictionary has unsaved edits. Edits are kept
 * as a draft and saved together, so the dictionary's version moves once per
 * save instead of once per keystroke.
 */
export function DataDictionarySaveBar({
  issueCount,
  isSaving,
  saveErrorMessage,
  onDiscard,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    // `data-sticky-action-bar` is what the NUX checklist and toasts clear.
    <div className={css.dataDictionarySaveBar} data-sticky-action-bar>
      <Group justify="space-between" gap="md" wrap="wrap">
        <Text
          size="sm"
          c={issueCount > 0 ? "danger" : "dimmed"}
          aria-live="polite"
        >
          {issueCount > 0 ? (
            <Plural
              value={issueCount}
              one="# thing to fix before saving"
              other="# things to fix before saving"
            />
          ) : (
            <Trans>Unsaved changes</Trans>
          )}
        </Text>
        <Group gap="sm">
          {saveErrorMessage ? (
            <Text size="sm" c="danger" role="alert">
              {saveErrorMessage}
            </Text>
          ) : null}
          <Button variant="default" onClick={onDiscard} disabled={isSaving}>
            <Trans>Discard</Trans>
          </Button>
          <OfflineGated>
            <Button
              onClick={onSave}
              loading={isSaving}
              disabled={issueCount > 0}
            >
              <Trans>Save changes</Trans>
            </Button>
          </OfflineGated>
        </Group>
      </Group>
    </div>
  );
}
