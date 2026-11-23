// tsx applies the producer tsconfig (and its automatic JSX runtime) only to
// `src`, so this file opts in itself when the node test runner loads it.
/** @jsxRuntime automatic */
import { MantineProvider, type MantineProviderProps } from "@mantine/core";
import { ReenactmentThemeBoundary } from "../../src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary";
import type { ReactNode } from "react";

type Props = MantineProviderProps;

/**
 * The product's `MantineProvider`, behind a boundary that hides any video
 * theme above it, so a reenactment renders exactly as the product does. The
 * root of every reenactment the adapter renders; it passes every prop
 * through unchanged.
 */
export function ProductThemeRoot(props: Readonly<Props>): ReactNode {
  return (
    <ReenactmentThemeBoundary>
      <MantineProvider {...props} />
    </ReenactmentThemeBoundary>
  );
}
