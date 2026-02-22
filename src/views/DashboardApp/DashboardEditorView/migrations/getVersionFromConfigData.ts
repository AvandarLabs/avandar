import { isNumber } from "$/lib/utils/guards/isNumber";

/**
 * Gets the schema version of the PuckConfig data.
 * @param data The PuckConfig data to get the version from.
 * @returns The schema version of the PuckConfig data.
 */
export function getVersionFromConfigData(
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
