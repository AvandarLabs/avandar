import { Paper } from "@mantine/core";
import { ReactNode } from "react";

type MantineSize = "xs" | "sm" | "md" | "lg" | "xl";
type MantineShadow = "xs" | "sm" | "md" | "lg" | "xl" | "none";

type PaperWrapperProps = {
  children: ReactNode;
  p?: MantineSize | number;
  mt?: MantineSize | number;
  radius?: MantineSize | number;
  shadow?: MantineShadow;
  bg?: string;
  withBorder?: boolean;
  className?: string;
};
export function PaperWrapper({
  children,
  p = "lg",
  mt = "lg",
  radius = "md",
  shadow = "md",
  bg = "white",
  withBorder = true,
}: PaperWrapperProps): JSX.Element {
  return (
    <Paper
      p={p}
      mt={mt}
      radius={radius}
      shadow={shadow}
      bg={bg}
      withBorder={withBorder}
    >
      {children}
    </Paper>
  );
}
