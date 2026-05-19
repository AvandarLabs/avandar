import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/**
 * @returns true if the viewport falls within the tablet range: at or above
 * the `sm` breakpoint and below `xl`. Covers iPad portrait, iPad landscape,
 * and small laptops where the global --mantine-scale override applies.
 */
export function useIsTabletSize(): boolean | undefined {
  const theme = useMantineTheme();
  return useMediaQuery(
    `(min-width: ${theme.breakpoints.sm}) and (max-width: ${theme.breakpoints.xl})`,
  );
}
