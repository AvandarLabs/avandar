import { formatDate } from "@avandar/utils";
import { Plural, Trans } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** Reference facts about a dictionary: where it came from and when. */
export function DataDictionaryRail({ dictionary }: Readonly<Props>): ReactNode {
  const datasetCount = dictionary.createdFromDatasetIds.length;
  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Details</Trans>}>
        <AppViewRail.Fact label={<Trans>Made from</Trans>}>
          {datasetCount === 0 ? (
            <Trans>Built by hand</Trans>
          ) : (
            <Plural value={datasetCount} one="# dataset" other="# datasets" />
          )}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={<Trans>Created</Trans>}>
          {formatDate(dictionary.createdAt, { format: "MMM D, YYYY" })}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={<Trans>Version</Trans>}>
          {dictionary.version}
        </AppViewRail.Fact>
      </AppViewRail.Group>
      {/* Group children render inside a `<dl>`, so the explanation is a
          fact rather than a paragraph. */}
      <AppViewRail.Group title={<Trans>How codes work</Trans>}>
        <AppViewRail.Fact label={<Trans>Both ways</Trans>}>
          <Trans>
            Data holding 1 becomes Male, and data holding Male becomes 1, from
            the same pair.
          </Trans>
        </AppViewRail.Fact>
      </AppViewRail.Group>
    </AppViewRail>
  );
}
