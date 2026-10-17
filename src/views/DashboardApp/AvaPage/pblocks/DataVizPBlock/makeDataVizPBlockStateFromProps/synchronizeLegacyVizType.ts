import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { makeDataVizPBlockStateFromProps } from "./makeDataVizPBlockStateFromProps";

/**
 * Reuses presentation-only conversion for frozen name-based configurations.
 * These converters copy column slots without looking up or allocating IDs.
 * The type bridge stays here; the result remains a legacy configuration.
 */
function _convertLegacyVizConfig(
  config: VizConfig.Legacy,
  vizType: VizConfig.Type,
): VizConfig.Legacy {
  return VizConfigs.convertVizConfig(config as VizConfig.T, vizType);
}

/** Synchronizes explicit legacy type edits without resolving column names. */
export function synchronizeLegacyVizType(
  options: Omit<
    Parameters<typeof makeDataVizPBlockStateFromProps>[0],
    "trigger"
  >,
): ReturnType<typeof makeDataVizPBlockStateFromProps> {
  const { props, changed, blockId, vizConfigMemory } = options;
  const vizConfig = props.vizConfig ?? { vizType: "table" };
  const vizType = props.vizType ?? vizConfig.vizType;
  const legacyProps = { ...props, vizConfig, vizType } as Extract<
    Props,
    { bindingVersion: 0 }
  >;
  if (changed.vizType && vizConfig.vizType !== vizType) {
    const memory = vizConfigMemory[blockId]?.legacy ?? {};
    return {
      props: {
        ...legacyProps,
        vizConfig:
          memory[vizType] ?? _convertLegacyVizConfig(vizConfig, vizType),
      },
      vizConfigMemory: {
        ...vizConfigMemory,
        [blockId]: {
          ...vizConfigMemory[blockId],
          legacy: { ...memory, [vizConfig.vizType]: vizConfig },
        },
      },
    };
  }
  return {
    props: changed.vizConfig
      ? { ...legacyProps, vizType: vizConfig.vizType }
      : legacyProps,
    vizConfigMemory,
  };
}
