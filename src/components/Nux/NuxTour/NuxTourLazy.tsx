import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const LazyNuxTour = lazy(async () => {
  const module = await import("@/components/Nux/NuxTour/NuxTour");
  return { default: module.NuxTour };
});

/**
 * Renders the tour, fetching the `react-joyride` chunk on first use.
 *
 * Keeps `react-joyride` out of the main chunk. Most users are not eligible for
 * the tutorial and must never download it; `NuxRoot` only renders this once a
 * milestone is actually open.
 */
export function NuxTourLazy(): ReactNode {
  return (
    <Suspense fallback={null}>
      <LazyNuxTour />
    </Suspense>
  );
}
