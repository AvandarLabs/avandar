import { Paper as MantinePaper, PaperProps } from "@mantine/core";
import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
} & PaperProps;

export function Paper({
  p = "lg",
  mt = "lg",
  radius = "md",
  shadow = "md",
  bg = "white",
  withBorder = true,
  ...rest
}: Props): JSX.Element {
  return (
    <MantinePaper
      p={p}
      mt={mt}
      radius={radius}
      shadow={shadow}
      bg={bg}
      withBorder={withBorder}
      {...rest}
    />
  );
}
