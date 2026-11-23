import { useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { DataCatalogDrive } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { ReactNode } from "react";

type Props = {
  listing: DataCatalogListing.T;
  /** The drive the listing came from, which names its organization levels. */
  drive: DataCatalogDrive.T | undefined;
};

/**
 * The "Published by" group: one fact per organization level the listing has,
 * each labelled with what its drive calls that level, such as "City" and
 * "Agency". Without a drive or a label, level 1 is "Organization" and a
 * deeper level is "Level {n}". Not rendered when the listing names no
 * organization.
 */
export function DataCatalogPublishedByGroup({
  listing,
  drive,
}: Props): ReactNode {
  const { t } = useLingui();
  const levels = [
    { name: listing.organization1Name, label: drive?.organization1Label },
    { name: listing.organization2Name, label: drive?.organization2Label },
    { name: listing.organization3Name, label: drive?.organization3Label },
    { name: listing.organization4Name, label: drive?.organization4Label },
  ].map((level, index) => {
    const levelNumber = index + 1;
    const fallbackLabel =
      levelNumber === 1 ? t`Organization` : t`Level ${levelNumber}`;
    return {
      levelNumber,
      name: level.name,
      label: level.label || fallbackLabel,
    };
  });
  const namedLevels = levels.filter((level) => {
    return Boolean(level.name);
  });
  if (namedLevels.length === 0) {
    return null;
  }

  return (
    <AppViewRail.Group title={t`Published by`}>
      {namedLevels.map((level) => {
        return (
          <AppViewRail.Fact key={level.levelNumber} label={level.label}>
            {level.name}
          </AppViewRail.Fact>
        );
      })}
    </AppViewRail.Group>
  );
}
