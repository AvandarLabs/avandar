import { propEq } from "@avandar/utils";
import { makeNameBoundVizConfigFromVizConfig } from "$/models/vizs/makeNameBoundVizConfigFromVizConfig/makeNameBoundVizConfigFromVizConfig";
import { transformAvaPageProps } from "../../utils/makeTraversalConfigFromAvaPageData/transformAvaPageProps";
import type { AvaPageDataMigration } from "../AvaPageDataMigrator";
import type {
  V4_AvaPageData,
  V5_AvaPageData,
  V5_AvaPageRootProps,
  V5_PBlockPropsRegistry,
} from "./AvaPageDataMigrationV5.types";

function _downgradeChart(
  props: V5_PBlockPropsRegistry["DataViz"],
): Record<string, unknown> {
  if (props.columnBindingVersion === 0) {
    const { columnBindingVersion: _version, ...legacy } = props;
    return legacy;
  }
  const {
    columnBindingVersion: _version,
    columnBindings,
    globalFilterTargets,
    ...rest
  } = props;
  Object.values(globalFilterTargets).forEach((target) => {
    if (target.kind !== "columnId") {
      return;
    }
    const column = columnBindings.columns.find(propEq("id", target.columnId));
    if (!column) {
      throw new Error(
        "Cannot downgrade DataViz: a global filter has no persisted binding",
      );
    }
    if (column.name !== target.authoringColumnName) {
      throw new Error(
        "Cannot downgrade DataViz: a global filter alias cannot be represented in v4",
      );
    }
  });
  const nameBoundConversion = makeNameBoundVizConfigFromVizConfig({
    config: props.vizConfig,
    columns: columnBindings.columns,
  });
  if (nameBoundConversion.issues.length) {
    throw new Error(
      "Cannot downgrade DataViz: a chart column has no persisted binding",
    );
  }
  const localFilters = props.localFilters.map(({ columnId, ...filter }) => {
    const column = columnBindings.columns.find(propEq("id", columnId));
    if (!column) {
      throw new Error(
        "Cannot downgrade DataViz: a local filter has no persisted binding",
      );
    }
    return { ...filter, columnName: column.name };
  });
  return { ...rest, vizConfig: nameBoundConversion.config, localFilters };
}

/**
 * Structural v5 migration. Live schema resolution belongs to runtime ingress.
 */
export const AvaPageDataMigrationV5 = {
  downgradedVersion: 4,
  upgradedVersion: 5,
  upgrade: (data: V4_AvaPageData): V5_AvaPageData => {
    return transformAvaPageProps<V5_PBlockPropsRegistry, V5_AvaPageRootProps>({
      data: data as unknown as V5_AvaPageData,
      transforms: {
        root: (props) => {
          return { ...props, schemaVersion: 5 };
        },
        DataViz: (props) => {
          return {
            ...props,
            columnBindingVersion: 0,
          } as V5_PBlockPropsRegistry["DataViz"];
        },
      },
    }) as V5_AvaPageData;
  },
  downgrade: (data: V5_AvaPageData): V4_AvaPageData => {
    return transformAvaPageProps<V5_PBlockPropsRegistry, V5_AvaPageRootProps>({
      data: data,
      transforms: {
        root: (props) => {
          return {
            ...props,
            schemaVersion: 4,
          } as unknown as V5_AvaPageRootProps;
        },
        DataViz: (props) => {
          return _downgradeChart(props) as V5_PBlockPropsRegistry["DataViz"];
        },
      },
    }) as unknown as V4_AvaPageData;
  },
} satisfies AvaPageDataMigration<V4_AvaPageData, V5_AvaPageData>;
