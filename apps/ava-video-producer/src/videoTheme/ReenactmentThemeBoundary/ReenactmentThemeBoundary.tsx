import { MantineThemeProvider } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

/**
 * Gives product UI a clean Mantine theme context inside a themed film.
 * Mantine's `MantineProvider` merges its theme onto any parent theme, so
 * without this boundary a reenactment would inherit the video theme's type
 * sizes, spacing, and component defaults. Wrap every reenactment root in it.
 */
export function ReenactmentThemeBoundary({ children }: Props): ReactNode {
  return (
    <MantineThemeProvider inherit={false}>{children}</MantineThemeProvider>
  );
}
