import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import css from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader.module.css";
import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  titleId: string;
};

/** Title and close control for the selected-feature drawer. */
export function FeatureInspectorHeader({ onClose, titleId }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group
      className={css.featureInspectorHeader}
      justify="space-between"
      wrap="nowrap"
    >
      <Text id={titleId} fw={600} size="sm">
        {t`Feature`}
      </Text>
      <ActionIcon
        variant="subtle"
        size="sm"
        color="neutral"
        onClick={onClose}
        aria-label={t`Close`}
      >
        <IconX size={16} />
      </ActionIcon>
    </Group>
  );
}
