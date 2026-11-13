import { Trans } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";
import { IconLink, IconReplace, IconTag } from "@tabler/icons-react";
import type { DictionaryUsageHow } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  howApplied: DictionaryUsageHow;
};

const ICON_BY_HOW = {
  reference: IconTag,
  linked: IconLink,
  changed: IconReplace,
} as const satisfies Record<DictionaryUsageHow, unknown>;

/** The badge naming how a dataset uses the dictionary. */
function HowAppliedBadgeText({ howApplied }: Readonly<Props>): ReactNode {
  switch (howApplied) {
    case "reference":
      return <Trans>Reference</Trans>;
    case "linked":
      return <Trans>Linked</Trans>;
    case "changed":
      return <Trans>Changed the data</Trans>;
  }
}

/** What that means for the dataset's values. */
function HowAppliedNote({ howApplied }: Readonly<Props>): ReactNode {
  switch (howApplied) {
    case "reference":
      return <Trans>data unchanged, always current</Trans>;
    case "linked":
      return <Trans>updates when this dictionary changes</Trans>;
    case "changed":
      return <Trans>keeps the version it was given</Trans>;
  }
}

/**
 * The Used by tab's "How it was applied" cell: a badge, then what it
 * means for the dataset's values.
 */
export function HowAppliedCell({ howApplied }: Readonly<Props>): ReactNode {
  const Icon = ICON_BY_HOW[howApplied];
  return (
    <Group gap="xs" wrap="nowrap">
      <Badge
        size="sm"
        variant="light"
        color="neutral"
        tt="none"
        flex="none"
        leftSection={<Icon size={12} aria-hidden />}
      >
        <HowAppliedBadgeText howApplied={howApplied} />
      </Badge>
      <Text size="xs" c="dimmed">
        <HowAppliedNote howApplied={howApplied} />
      </Text>
    </Group>
  );
}
