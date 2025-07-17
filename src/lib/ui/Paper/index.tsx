import { Paper as MantinePaper, PaperProps } from "@mantine/core";
import { ReactNode } from "react";

export function Paper({
  children,
  p = "lg",
  mt = "lg",
  radius = "md",
  shadow = "md",
  bg = "white",
  withBorder = true,
  ...rest
}: PaperProps & { children?: ReactNode }): JSX.Element {
  return (
    <MantinePaper
      p={p}
      mt={mt}
      radius={radius}
      shadow={shadow}
      bg={bg}
      withBorder={withBorder}
      {...rest}
    >
      {children}
    </MantinePaper>
  );
}
