import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { makeDataVizPBlockStateFromProps } from "./makeDataVizPBlockStateFromProps";

/**
 * Synchronizes explicit viz type edits on name-bound props without resolving
 * column names.
 */
export function synchronizeColNameBoundVizType(
  options: Omit<
    Parameters<typeof makeDataVizPBlockStateFromProps>[0],
    "trigger"
  >,
): ReturnType<typeof makeDataVizPBlockStateFromProps> {
  const { props, changed, blockId, vizConfigMemory } = options;
  const vizConfig = props.vizConfig ?? { vizType: "table" };
  const vizType = props.vizType ?? vizConfig.vizType;
  const colNameBoundProps = { ...props, vizConfig, vizType } as Extract<
    Props,
    { columnBindingVersion: 0 }
  >;
  if (changed.vizType && vizConfig.vizType !== vizType) {
    const memory = vizConfigMemory[blockId]?.colNameBound ?? {};
    // Presentation converters copy name-bound column slots without
    // allocating IDs.
    return {
      props: {
        ...colNameBoundProps,
        vizConfig:
          memory[vizType] ??
          VizConfigs.convertVizConfig(vizConfig as VizConfig.T, vizType),
      },
      vizConfigMemory: {
        ...vizConfigMemory,
        [blockId]: {
          ...vizConfigMemory[blockId],
          colNameBound: { ...memory, [vizConfig.vizType]: vizConfig },
        },
      },
    };
  }
  return {
    props: changed.vizConfig
      ? { ...colNameBoundProps, vizType: vizConfig.vizType }
      : colNameBoundProps,
    vizConfigMemory,
  };
}
