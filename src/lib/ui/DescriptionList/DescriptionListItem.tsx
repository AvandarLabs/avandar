import { Grid, Text } from "@mantine/core";
import { ReactNode } from "react";
import css from "./DescriptionListItem.module.css";

type Props = {
  label: React.ReactNode;
  children: ReactNode;
};

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
