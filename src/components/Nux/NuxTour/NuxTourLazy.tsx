import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

/**
 * Keeps `react-joyride` out of the main chunk. Most users are not eligible for
 * the tutorial and must never download it; `NuxRoot` only renders this once a
 * milestone is actually open.
 */
const LazyNuxTour = lazy(async () => {
  const module = await import("@/components/Nux/NuxTour/NuxTour");
  return { default: module.NuxTour };
});

export function NuxTourLazy(): ReactNode {
  return (
    <Suspense fallback={null}>
      <LazyNuxTour />
    </Suspense>
  );
}
