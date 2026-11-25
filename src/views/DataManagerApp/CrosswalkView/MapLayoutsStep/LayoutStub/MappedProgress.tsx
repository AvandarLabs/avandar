import { useLingui } from "@lingui/react/macro";
import { Progress, Stack, Text } from "@mantine/core";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
};

/**
 * "{mapped} of {total} mapped", counting datasets, over a progress bar. A
 * dataset in the reference layout or in a mapped layout counts as mapped.
 * The visible line is hidden from screen readers, since the bar carries
 * the same words as its name and value.
 */
export function MappedProgress({ draft }: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const counts = CrosswalkDraft.countDatasets(draft);
  const mapped = i18n.number(counts.mapped);
  const total = i18n.number(counts.total);
  const label = t`${mapped} of ${total} mapped`;
  const percent =
    counts.total === 0 ? 0 : Math.round((counts.mapped / counts.total) * 100);
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600} aria-hidden>
        {label}
      </Text>
      <Progress.Root size="sm">
        <Progress.Section
          value={percent}
          aria-label={label}
          aria-valuetext={label}
        />
      </Progress.Root>
    </Stack>
  );
}
