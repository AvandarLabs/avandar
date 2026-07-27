import { Badge, Group, Text } from "@mantine/core";
import type { BiasHit } from "@/components/privacy/privacy-helpers/detectBias/detectBias";

type Props = {
  /** Caption shown before the badges (e.g. "Detected:", "Bias detected:"). */
  label: React.ReactNode;
  /** Bias hits to render. Deduped by label upstream, so label is unique. */
  hits: BiasHit[];
};

/**
 * Renders a captioned row of bias-detection badges.
 * Returns one badge for each supplied bias hit.
 */
export function BiasHitBadges({ label, hits }: Props): React.ReactNode {
  return (
    <Group gap="xs" wrap="wrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {hits.map((h) => {
        return (
          <Badge key={h.label} size="sm" color="blue" variant="light">
            {h.label}
          </Badge>
        );
      })}
    </Group>
  );
}
