import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Progress, Stack, Text } from "@mantine/core";
import { useId } from "react";
import type { CombiningProgressCount } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { ReactNode } from "react";

/**
 * "Read 37 of 100 datasets" and a bar, while the combined preview reads
 * the datasets it stacks. The bar is named by the visible words. It has no
 * live region of its own: the preview announces progress in coarse steps,
 * so a screen reader is not read every dataset.
 */
export function CombiningProgress({
  readCount,
  totalCount,
}: Readonly<CombiningProgressCount>): ReactNode {
  const { i18n } = useLingui();
  const labelId = useId();
  const readLabel = i18n.number(readCount);
  const label = plural(totalCount, {
    one: `Read ${readLabel} of # dataset`,
    other: `Read ${readLabel} of # datasets`,
  });
  const percent =
    totalCount === 0 ? 0 : Math.round((readCount / totalCount) * 100);
  return (
    <Stack gap={4} w="100%" maw={360}>
      <Text id={labelId} size="sm" ta="center">
        {label}
      </Text>
      <Progress.Root size="sm">
        <Progress.Section value={percent} aria-labelledby={labelId} />
      </Progress.Root>
    </Stack>
  );
}
