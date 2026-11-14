import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Progress, Stack, Text } from "@mantine/core";
import type { CombiningProgressCount } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { ReactNode } from "react";

/**
 * "Read 37 of 100 datasets" and a bar, while the combined preview reads
 * the datasets it stacks. The bar carries the same words as its name. It
 * sits inside the preview's reading status, which announces the count as
 * it changes, so it adds no live region of its own.
 */
export function CombiningProgress({
  readCount,
  totalCount,
}: Readonly<CombiningProgressCount>): ReactNode {
  const { i18n } = useLingui();
  const readLabel = i18n.number(readCount);
  const label = plural(totalCount, {
    one: `Read ${readLabel} of # dataset`,
    other: `Read ${readLabel} of # datasets`,
  });
  const percent =
    totalCount === 0 ? 0 : Math.round((readCount / totalCount) * 100);
  return (
    <Stack gap={4} w="100%" maw={360}>
      <Text size="sm" ta="center">
        {label}
      </Text>
      <Progress value={percent} aria-label={label} size="sm" />
    </Stack>
  );
}
