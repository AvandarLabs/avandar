import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  reason: "meaning" | "similar_name";
};

/**
 * Marks an entry whose columns were joined by a guess, and says why on
 * hover or keyboard focus. Keep apart on the same row undoes the guess.
 */
export function SuggestedTag({ reason }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const explanation =
    reason === "meaning"
      ? t`Matched by meaning, not just by name. Keep apart if these record different things.`
      : t`Similar names and values. Keep apart if these record different things.`;
  return (
    <Tooltip label={explanation} multiline w={260}>
      <Badge
        tabIndex={0}
        variant="light"
        color="neutral"
        size="sm"
        tt="none"
        leftSection={<IconSparkles size={12} aria-hidden />}
      >
        <Trans>Suggested</Trans>
      </Badge>
    </Tooltip>
  );
}
