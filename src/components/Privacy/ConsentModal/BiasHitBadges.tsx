import { Badge, Group, Text } from "@mantine/core";
import type { BiasHit } from "@/lib/privacy/biasDetector/biasDetector";

type Props = {
  /** Caption shown before the badges (e.g. "Detected:", "Bias detected:"). */
  label: React.ReactNode;
  /** Bias hits to render. Deduped by label upstream, so label is unique. */
  hits: BiasHit[];
};

/**
 * Captioned row of bias-detection badges. `detectBias` dedupes hits by label
 * via a `seen` Set, so the label is a safe stable key.
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
