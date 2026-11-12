import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Tooltip, VisuallyHidden } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useId } from "react";
import type { ReactNode } from "react";

type Props = {
  reason: "meaning" | "similar_name";
};

/**
 * Marks an entry whose columns were joined by a guess, and says why on
 * hover, on keyboard focus, and to screen readers. Keep apart on the same
 * row undoes the guess.
 */
export function SuggestedTag({ reason }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const explanationId = useId();
  const explanation =
    reason === "meaning"
      ? t`Matched by meaning, not just by name. Keep apart if these record different things.`
      : t`Similar names and values. Keep apart if these record different things.`;
  return (
    <>
      <Tooltip label={explanation} multiline w={260}>
        <Badge
          tabIndex={0}
          aria-describedby={explanationId}
          variant="light"
          color="neutral"
          size="sm"
          tt="none"
          leftSection={<IconSparkles size={12} aria-hidden />}
        >
          <Trans>Suggested</Trans>
        </Badge>
      </Tooltip>
      <VisuallyHidden id={explanationId}>{explanation}</VisuallyHidden>
    </>
  );
}
