import { Grid, Text } from "@mantine/core";
import css from "@ui/DescriptionList/DescriptionListItem.module.css";
import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  children: ReactNode;
};

/**
 * A two-column list of items to render metadata. This component is
 * useful to render key-value pairs.
 *
 * First column is the label, second column is the rendered value.
 * Rendered as a description list using HTML `<dt>` and `<dd>` elements.
 */
export function DescriptionListItem({ label, children }: Props): JSX.Element {
  return (
    <Grid className={css.root} px="xs" py="sm">
      <Grid.Col span={3} p={0}>
        <Text component="dt" size="sm" fw="bold" tt="uppercase" c="dimmed">
          {label}
        </Text>
      </Grid.Col>
      <Grid.Col span={9} p={0}>
        <Text component="dd" size="sm">
          {children}
        </Text>
      </Grid.Col>
    </Grid>
  );
}
