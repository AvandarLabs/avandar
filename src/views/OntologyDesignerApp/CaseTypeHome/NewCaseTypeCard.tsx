import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Text, ThemeIcon, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import css from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.module.css";

type Props = {
  onCreate: () => void;
};

/**
 * Dashed create card: describe the work in chat, Avandar proposes the type.
 */
export function NewCaseTypeCard({ onCreate }: Readonly<Props>): ReactNode {
  return (
    <button type="button" className={css.createCard} onClick={onCreate}>
      <ThemeIcon size={48} radius="xl" color="primary">
        <IconPlus size={28} stroke={1.75} aria-hidden />
      </ThemeIcon>
      <Title order={3} fw={600}>
        <Trans>New case type</Trans>
      </Title>
      <Text c="dimmed" size="sm" maw={260}>
        <Trans>
          Describe what you want to manage in plain language. Avandar builds it
          for you.
        </Trans>
      </Text>
    </button>
  );
}
