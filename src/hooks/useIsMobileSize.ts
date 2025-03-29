import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/**
 *
 * @returns true if the current screen size is mobile or smaller
 */
export function useIsMobileSize(): boolean | undefined {
  const theme = useMantineTheme();
  return useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
}
