import { Trans } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";
import {
  IconArrowMerge,
  IconLink,
  IconReplace,
  IconTag,
} from "@tabler/icons-react";
import type { DictionaryUsageHow } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  howApplied: DictionaryUsageHow;
  /** The crosswalk that combined the dataset, for a crosswalk row. */
  crosswalkName: string | undefined;
};

const ICON_BY_HOW = {
  reference: IconTag,
  linked: IconLink,
  changed: IconReplace,
  crosswalk: IconArrowMerge,
} as const satisfies Record<DictionaryUsageHow, unknown>;

/** The badge naming how a dataset uses the dictionary. */
function HowAppliedBadgeText({
  howApplied,
}: Readonly<{ howApplied: DictionaryUsageHow }>): ReactNode {
  switch (howApplied) {
    case "reference":
      return <Trans>Reference</Trans>;
    case "linked":
      return <Trans>Linked</Trans>;
    case "changed":
      return <Trans>Changed the data</Trans>;
    case "crosswalk":
      return <Trans>Crosswalk</Trans>;
  }
}

/** What that means for the dataset's values. */
function HowAppliedNote({
  howApplied,
  crosswalkName,
}: Readonly<Props>): ReactNode {
  switch (howApplied) {
    case "reference":
      return <Trans>data unchanged, always current</Trans>;
    case "linked":
      return <Trans>updates when this dictionary changes</Trans>;
    case "changed":
      return <Trans>keeps the version it was given</Trans>;
    case "crosswalk":
      return <Trans>Through {crosswalkName}</Trans>;
  }
}

/**
 * The Used by tab's "How it was applied" cell: a badge, then what it
 * means for the dataset's values, or which crosswalk combined it.
 */
export function HowAppliedCell({
  howApplied,
  crosswalkName,
}: Readonly<Props>): ReactNode {
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
        <HowAppliedNote howApplied={howApplied} crosswalkName={crosswalkName} />
      </Text>
    </Group>
  );
}
