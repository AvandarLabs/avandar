import { Stack } from "@mantine/core";
import { DescriptionListItem } from "@ui/DescriptionList/DescriptionListItem";
import type { ReactNode } from "react";

type Props = {
  /** Children should be `DescriptionListItem` components */
  children: ReactNode;
};

export function DescriptionList({ children }: Props): JSX.Element {
  return (
    <Stack component="dl" gap={0}>
      {children}
    </Stack>
  );
}

DescriptionList.Item = DescriptionListItem;
