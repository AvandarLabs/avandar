import { SampleSite } from "./SampleSite";
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
      {input.sites.map((site, index) => (
        <SampleSite
          key={site.id}
          site={site}
          index={index}
          frame={frame}
          accent={accent}
          selected={input.selectedSiteIds.includes(site.id)}
          showLabel={
            input.showUnselectedLabels ||
            input.selectedSiteIds.includes(site.id)
          }
        />
      ))}
    </g>
  );
}
