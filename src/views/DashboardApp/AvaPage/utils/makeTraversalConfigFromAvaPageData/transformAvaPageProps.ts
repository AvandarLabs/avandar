import { objectValuesMap } from "@avandar/utils";
import { transformProps } from "@puckeditor/core";
import { makeTraversalConfigFromAvaPageData } from "./makeTraversalConfigFromAvaPageData";
import type { Config, Data } from "@puckeditor/core";

type PropTransforms<Components, Root> = {
  [Name in keyof Components]?: (
    props: Components[Name] & { id: string },
  ) => Components[Name];
} & { root?: (props: Root) => Root };

/** Transforms every saved block, including detached zones and nested slots. */
export function transformAvaPageProps<
  Components extends Record<string, Record<string, unknown>>,
  Root extends Record<string, unknown>,
>({
  data,
  transforms,
}: Readonly<{
  data: Data<Components, Root>;
  transforms: PropTransforms<Components, Root>;
}>): Data<Components, Root> {
  const config = makeTraversalConfigFromAvaPageData(data);
  // Puck's overload accepts only its default root type and requires a root
  // transform. Serialized input carries the supplied root and component IDs.
  const transform = transformProps as unknown as (
    input: Data<Components, Root>,
    mapping: PropTransforms<Components, Root>,
    config: Config,
  ) => Data<Components, Root>;
  const transformed = transform(
    { ...data, zones: undefined },
    transforms,
    config,
  );
  if (!data.zones) {
    const { zones: _zones, ...withoutZones } = transformed;
    return withoutZones;
  }
  const zones = objectValuesMap(data.zones, (content) => {
    return transform({ root: data.root, content }, transforms, config).content;
  });
  return { ...transformed, zones };
}
