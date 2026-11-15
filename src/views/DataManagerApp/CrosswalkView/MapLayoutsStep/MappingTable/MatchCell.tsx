import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Group, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  mapping: CrosswalkDraft.Mapping | undefined;
};

/** Why a fill was suggested, with its score where it has one. */
function useReasonText(
  reason: CrosswalkMapping.Reason,
  confidence: number | undefined,
): string {
  const { t, i18n } = useLingui();
  const percent =
    confidence === undefined
      ? undefined
      : i18n.number(confidence, { style: "percent", maximumFractionDigits: 0 });
  return matchLiteral(reason, {
    name_and_type: () => {
      return percent ? t`Name and type · ${percent}` : t`Name and type`;
    },
    same_values: () => {
      return percent ? t`Same values · ${percent}` : t`Same values`;
    },
    similar_layout: () => {
      return t`From a similar layout`;
    },
    meaning: () => {
      return t`Meaning`;
    },
  });
}

/** The reason line, for a fill that came from a match. */
function ReasonText(
  props: Readonly<{
    reason: CrosswalkMapping.Reason;
    confidence: number | undefined;
  }>,
): ReactNode {
  const text = useReasonText(props.reason, props.confidence);
  return (
    <Text size="sm" c="dimmed">
      {text}
    </Text>
  );
}

/**
 * Why a fill is there: its match reason and score, and a Suggested tag
 * while it waits for Accept. Empty for a fill the user set.
 */
export function MatchCell({ mapping }: Readonly<Props>): ReactNode {
  if (!mapping || (!mapping.reason && mapping.status !== "suggested")) {
    return null;
  }
  return (
    <Group gap="xs" wrap="wrap">
      {mapping.reason ? (
        <ReasonText reason={mapping.reason} confidence={mapping.confidence} />
      ) : null}
      {mapping.status === "suggested" ? (
        <Badge
          size="sm"
          variant="light"
          color="neutral"
          tt="none"
          leftSection={<IconSparkles size={10} aria-hidden />}
        >
          <Trans>Suggested</Trans>
        </Badge>
      ) : null}
    </Group>
  );
}
