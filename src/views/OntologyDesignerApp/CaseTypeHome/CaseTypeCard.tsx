import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconBlocks, IconTrash } from "@tabler/icons-react";
import css from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.module.css";
import type { ReactNode } from "react";

type CaseTypeCardModel = {
  id: string;
  name: string;
  description: string | undefined;
};

type Props = {
  caseType: CaseTypeCardModel;
  onOpen: () => void;
  /** Omitted when the caller has nothing to do with a delete request. */
  onDelete?: () => void;
};

/**
 * One case type on the Case Manager home grid.
 *
 * The delete control is a sibling of the card button rather than a child: a
 * button inside a button is invalid, and nesting would make one click both
 * delete and open.
 */
export function CaseTypeCard({
  caseType,
  onOpen,
  onDelete,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <div className={css.cardShell}>
      <button
        type="button"
        className={css.card}
        onClick={onOpen}
        aria-label={t`Open ${caseType.name}`}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <ThemeIcon radius="md" size={40} variant="light">
            <IconBlocks size={22} stroke={1.5} aria-hidden />
          </ThemeIcon>
        </Group>
        <Stack gap={4} miw={0}>
          <Title order={3} fw={600} lineClamp={1}>
            {caseType.name}
          </Title>
          <Text c="dimmed" size="sm" lineClamp={2} mih={40}>
            {caseType.description ?? (
              <Trans>No description has been added yet.</Trans>
            )}
          </Text>
        </Stack>
        <div className={css.footer}>
          <span className={css.openHint}>
            <Trans>Open</Trans>
          </span>
        </div>
      </button>
      {onDelete ?
        <Tooltip label={t`Delete case type`} position="left">
          <ActionIcon
            className={css.cardDeleteButton}
            variant="subtle"
            color="danger"
            aria-label={t`Delete ${caseType.name}`}
            onClick={onDelete}
          >
            <IconTrash size={18} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      : null}
    </div>
  );
}
