import { Trans } from "@lingui/react/macro";
import { Button, Group, Title } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode, Ref } from "react";

type Props = {
  title: string;
  /** The title takes focus after a list is accepted. */
  titleRef: Ref<HTMLHeadingElement>;
  isSuggesting: boolean;
  /** True when no suggestion can be asked for this list right now. */
  isSuggestOff: boolean;
  onSuggest: () => void;
};

/** The selected list's title and its Suggest labels button. */
export function CodeListPaneHeader({
  title,
  titleRef,
  isSuggesting,
  isSuggestOff,
  onSuggest,
}: Readonly<Props>): ReactNode {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Title order={2} fz="xl" fw={650} tabIndex={-1} ref={titleRef}>
        {title}
      </Title>
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconSparkles size={14} aria-hidden />}
        loading={isSuggesting}
        disabled={isSuggestOff}
        onClick={onSuggest}
      >
        <Trans>Suggest labels</Trans>
      </Button>
    </Group>
  );
}
