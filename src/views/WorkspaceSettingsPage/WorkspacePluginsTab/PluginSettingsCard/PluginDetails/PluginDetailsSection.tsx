import { Stack, Title } from "@mantine/core";
import type { TitleOrder } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{
  title: ReactNode;
  children: ReactNode;

  /**
   * The heading level of the title. 6 by default, which nests it under the
   * plugin name's order 5 heading on a plugin's settings card.
   */
  headingOrder?: TitleOrder;
}>;

/**
 * One labeled block inside a plugin's expanded details, such as "What it
 * adds". Used by `PluginAdditionsSection` and `PluginDataAccessSection` so
 * both read as the same kind of heading, under the plugin's name on its
 * settings card or under a step heading in the install wizard.
 */
export function PluginDetailsSection({
  title,
  children,
  headingOrder = 6,
}: Props): JSX.Element {
  return (
    <Stack gap="xxs">
      <Title order={headingOrder} size="sm" fw={500}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}
