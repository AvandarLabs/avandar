import { Paper as MantinePaper, PaperProps } from "@mantine/core";
import { ReactNode } from "react";

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
  radius = "md",
  shadow = "md",
  noShadow = false,
  bg = "white",
  withBorder = true,
  ...rest
}: Props): JSX.Element {
  return (
    <MantinePaper
      p={p}
      radius={radius}
      bg={bg}
      withBorder={withBorder}
      shadow={noShadow ? undefined : shadow}
      {...rest}
    />
  );
}
