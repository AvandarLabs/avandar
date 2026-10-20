import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";

/**
 * Reads the timestamp HDX datasets are crawled and resumed by:
 * `metadata_modified`, which changes whenever a dataset or any of its
 * resources is added or edited.
 *
 * @throws When the dataset has none, since it then cannot be ordered.
 */
export function getHdxDatasetTimestamp(
  ckanPackage: Pick<CkanPackage, "name" | "metadata_modified">,
): Date {
  if (ckanPackage.metadata_modified === undefined) {
    throw new Error(
      `HDX dataset ${ckanPackage.name} has no metadata_modified, so it cannot be ordered.`,
    );
  }
  return parseCkanTimestamp(ckanPackage.metadata_modified);
}
