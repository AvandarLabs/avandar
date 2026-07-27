import { Trans } from "@lingui/react/macro";
import { Alert, Code, Stack, Text } from "@mantine/core";
import { IconBulb } from "@tabler/icons-react";
import { BiasHitBadges } from "./BiasHitBadges";
import type { BiasHit } from "@/components/privacy/privacy-helpers/detectBias/detectBias";

type Props = {
  /** Bias findings driving the nudge. Non-empty when this panel renders. */
  bias: BiasHit[];
  /** What the user wrote, echoed back for context. */
  userText?: string;
  /** Pre-translated Alert title. */
  alertTitle: string;
};

/**
 * Mode C (`bias_nudge`): a soft, non-blocking nudge. "Continue as-is" is
 * always available alongside "Use suggestion" in the action bar.
 */
export function BiasNudgePanel({
  bias,
  userText,
  alertTitle,
}: Props): React.ReactNode {
  return (
    <>
      <Alert color="blue" icon={<IconBulb size={18} />} title={alertTitle}>
        <Text size="sm">
          <Trans>
            Your question contains language that may bias the AI&apos;s answer.
          </Trans>
        </Text>
      </Alert>

      <BiasHitBadges label={<Trans>Detected:</Trans>} hits={bias} />

      {userText ?
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            <Trans>You wrote:</Trans>
          </Text>
          <Code block>{userText}</Code>
        </Stack>
      : null}

      {bias[0]?.suggestion ?
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            <Trans>Suggested:</Trans>
          </Text>
          <Text size="sm">{bias[0].suggestion}</Text>
        </Stack>
      : null}
    </>
  );
}
