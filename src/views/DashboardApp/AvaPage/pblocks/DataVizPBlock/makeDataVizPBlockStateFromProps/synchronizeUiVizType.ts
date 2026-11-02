import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { makeDataVizPBlockStateFromProps } from "./makeDataVizPBlockStateFromProps";

/**
 * Synchronizes explicit viz type edits on name-bound props without resolving
 * column names.
 */
export function synchronizeUiVizType(
  options: Omit<
    Parameters<typeof makeDataVizPBlockStateFromProps>[0],
    "trigger"
  >,
): ReturnType<typeof makeDataVizPBlockStateFromProps> {
  const { props, changed, blockId, vizConfigMemory } = options;
  const vizConfig = props.vizConfig ?? { vizType: "table" };
  const vizType = props.vizType ?? vizConfig.vizType;
  const columnNameProps = { ...props, vizConfig, vizType } as Extract<
    Props,
    { columnBindingVersion: 0 }
  >;
  if (changed.vizType && vizConfig.vizType !== vizType) {
    const memory = vizConfigMemory[blockId]?.uiVizConfigs ?? {};
    // Presentation converters copy name-bound column slots without
    // allocating IDs.
    return {
      props: {
        ...columnNameProps,
        vizConfig:
          memory[vizType] ??
          AvaVizConfigs.convertVizConfig(vizConfig as AvaVizConfig.T, vizType),
      },
      vizConfigMemory: {
        ...vizConfigMemory,
        [blockId]: {
          ...vizConfigMemory[blockId],
          uiVizConfigs: { ...memory, [vizConfig.vizType]: vizConfig },
        },
      },
    };
  }
  return {
    props: changed.vizConfig
      ? { ...columnNameProps, vizType: vizConfig.vizType }
      : columnNameProps,
    vizConfigMemory,
  };
}
