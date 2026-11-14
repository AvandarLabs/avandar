import "@mantine/core/styles.layer.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

const ATLAS_CHROME_THEME = {
  fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif",
} as const;

/**
 * The gallery chrome's own Mantine theme, for controls inside the Atlas
 * modals such as the Details / Design tokens tabs and the token editor. It
 * never carries video tokens; previews get theirs from `GalleryItemTheme`.
 */
export function AtlasChromeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <MantineProvider theme={ATLAS_CHROME_THEME}>{children}</MantineProvider>
  );
}
