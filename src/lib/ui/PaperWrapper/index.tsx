import { Paper as MantinePaper, PaperProps } from "@mantine/core";





};
export function Paper({
  p = "lg",
  mt = "lg",
  radius = "md",
  shadow = "md",
  bg = "white",
  withBorder = true,
  ...rest
}: PaperProps): JSX.Element {
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