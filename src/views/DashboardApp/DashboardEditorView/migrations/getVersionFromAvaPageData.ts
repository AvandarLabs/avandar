import { isNumber } from "$/lib/utils/guards/isNumber";

/**
 * Gets the schema version of the AvaPageData object.
 * @param data The AvaPageData object to get the version from.
 * @returns The schema version or undefined if none found
 */
export function getVersionFromAvaPageData(
  data: Readonly<{
    root: { props?: { schemaVersion?: number | undefined } };
  }>,
): number | undefined {
  if (data.root.props) {
    return (
        "schemaVersion" in data.root.props &&
          isNumber(data.root.props.schemaVersion)
      ) ?
        data.root.props.schemaVersion
      : undefined;
  }
  return undefined;
}
