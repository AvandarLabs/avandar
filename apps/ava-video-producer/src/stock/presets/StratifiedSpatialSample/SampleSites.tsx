import { SampleSite } from "./SampleSite/SampleSite";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Selection leaves every eligible site anchor and identity key in place. */
export function SampleSites({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.sites.map((site, index) => {
        // Selection has at most eight sites. Reusing this result
        // avoids duplicate scans without allocating a per-frame Set.
        // react-doctor-disable-next-line js-set-map-lookups
        const isSelected = input.selectedSiteIds.includes(site.id);
        return (
          <SampleSite
            key={site.id}
            site={site}
            index={index}
            frame={frame}
            accent={accent}
            selected={isSelected}
            showLabel={input.showUnselectedLabels || isSelected}
          />
        );
      })}
    </g>
  );
}
