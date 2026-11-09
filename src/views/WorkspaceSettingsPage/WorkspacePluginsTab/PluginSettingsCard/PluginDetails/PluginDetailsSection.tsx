import { Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{
  title: ReactNode;
  children: ReactNode;
}>;

/**
 * One labeled block inside a plugin's expanded details, such as "What it
 * adds". Used by `PluginAdditionsSection` and `PluginDataAccessSection` so
 * both read as the same kind of heading under the plugin's name.
 */
export function PluginDetailsSection({ title, children }: Props): JSX.Element {
  return (
    <Stack gap="xxs">
      {/* Order 6 nests the label under the plugin name's order 5 heading. */}
      <Title order={6} size="sm" fw={500}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}
