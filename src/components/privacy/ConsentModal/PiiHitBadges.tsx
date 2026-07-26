import { Badge, Group, Text } from "@mantine/core";
import type { PiiPatternHit } from "@/components/privacy/privacy-helpers/piiDetector/piiDetector";

type Props = {
  /** Caption shown before the badges (e.g. "Detected:", "PII detected:"). */
  label: React.ReactNode;
  /** PII hits to render. Deduped upstream, so labels are unique per render. */
  hits: PiiPatternHit[];
  /** Mantine color applied to every badge in the list. */
  color: string;
};

/**
 * Captioned row of PII-detection badges. Hits are unique by label (column and
 * content layers never share a label and each layer dedupes), so the label is
 * a safe stable key.
 */
export function PiiHitBadges({ label, hits, color }: Props): React.ReactNode {
  return (
    <Group gap="xs" wrap="wrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {hits.map((h: PiiPatternHit) => {
        return (
          <Badge key={h.label} size="sm" color={color} variant="light">
            {h.label}
          </Badge>
        );
      })}
    </Group>
  );
}
