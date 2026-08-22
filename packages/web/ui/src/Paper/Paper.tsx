import type { PaperProps } from "@mantine/core";
import type { ReactNode } from "react";

import { Paper as MantinePaper } from "@mantine/core";

type Props = {
  children?: ReactNode;
  noShadow?: boolean;
} & PaperProps;

/**
 * A lightweight wrapper around the Mantine Paper component that sets some
 * defaults that we want to use across Avandar.
 */
export function Paper({
  p = "lg",
  radius = "sm",
  shadow = "sm",
  noShadow = false,
  bg = "var(--ava-surface-raised)",
  withBorder = true,
  ...rest
}: Props): JSX.Element {
  return (
    <MantinePaper
      p={p}
      radius={radius}
      bg={bg}
      withBorder={withBorder}
      shadow={noShadow ? "none" : shadow}
      {...rest}
    />
  );
}
