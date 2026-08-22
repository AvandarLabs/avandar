import type { VanitySlugFieldProps } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";
import type { ReactNode } from "react";

import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Code, Group } from "@mantine/core";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";

import { ShareUrlActions } from "@/views/DashboardApp/DashboardShareModal/ShareUrlActions";
import { VanitySlugField } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";

import { doesVanitySlugChangeInvalidatePreviousUrl } from "./doesVanitySlugChangeInvalidatePreviousUrl";
import { openVanitySlugChangeConfirmModal } from "./openVanitySlugChangeConfirmModal";
import css from "./PublishDashboardStatus.module.css";

type Props = {
  targetUrl: string;
  pathPrefix: string;
  vanitySlug: VanitySlugFieldProps | undefined;
};

function PublishedUrlEditorActions({
  canSave,
  onSave,
  onCancel,
}: Readonly<{
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
}>): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <ActionIcon
        tooltip={t`Save`}
        variant="light"
        color="teal"
        size="lg"
        aria-label={t`Save URL`}
        disabled={!canSave}
        onClick={onSave}
      >
        <IconCheck size={18} />
      </ActionIcon>
      <ActionIcon
        tooltip={t`Cancel`}
        variant="light"
        color="neutral"
        size="lg"
        aria-label={t`Cancel URL change`}
        onClick={onCancel}
      >
        <IconX size={18} />
      </ActionIcon>
    </>
  );
}

function _saveEditedVanitySlug(
  options: Readonly<{
    previousSlug: string;
    nextSlug: string;
    onCommit: () => void;
  }>,
): void {
  if (
    doesVanitySlugChangeInvalidatePreviousUrl({
      previousSlug: options.previousSlug,
      nextSlug: options.nextSlug,
    })
  ) {
    openVanitySlugChangeConfirmModal({ onConfirm: options.onCommit });
    return;
  }
  options.onCommit();
}

function ChangeUrlButton({
  onClick,
}: Readonly<{ onClick: () => void }>): ReactNode {
  const { t } = useLingui();
  return (
    <ActionIcon
      tooltip={t`Change URL`}
      variant="light"
      color="neutral"
      size="lg"
      aria-label={t`Change URL`}
      onClick={onClick}
    >
      <IconPencil size={18} />
    </ActionIcon>
  );
}

/**
 * The published URL plus copy, QR, and an inline custom-path editor.
 */
export function PublishedTargetUrl({
  targetUrl,
  pathPrefix,
  vanitySlug,
}: Readonly<Props>): ReactNode {
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const slugAtEditStartRef = useRef(vanitySlug?.slugInput ?? "");

  if (!vanitySlug) {
    return (
      <Code block className={css.publishDashboardStatusTargetUrl}>
        {targetUrl}
      </Code>
    );
  }

  const canSave =
    !vanitySlug.hasPendingCheck &&
    (vanitySlug.isAccepted || !vanitySlug.normalisedSlug);

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      {isEditingUrl ? (
        <VanitySlugField {...vanitySlug} urlPrefix={pathPrefix} />
      ) : (
        <Code w="100%" block className={css.publishDashboardStatusTargetUrl}>
          {targetUrl}
        </Code>
      )}
      {isEditingUrl ? (
        <PublishedUrlEditorActions
          canSave={canSave}
          onSave={() => {
            _saveEditedVanitySlug({
              previousSlug: slugAtEditStartRef.current,
              nextSlug: vanitySlug.slugInput,
              onCommit: () => {
                setIsEditingUrl(false);
              },
            });
          }}
          onCancel={() => {
            vanitySlug.onChange(slugAtEditStartRef.current);
            setIsEditingUrl(false);
          }}
        />
      ) : (
        <ChangeUrlButton
          onClick={() => {
            slugAtEditStartRef.current = vanitySlug.slugInput;
            setIsEditingUrl(true);
          }}
        />
      )}
      <ShareUrlActions url={targetUrl} />
    </Group>
  );
}
