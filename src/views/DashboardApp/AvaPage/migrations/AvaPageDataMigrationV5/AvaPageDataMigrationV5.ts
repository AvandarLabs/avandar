import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import { transformAvaPageProps } from "../../utils/createAvaPageTraversalConfig/transformAvaPageProps";
import type { AvaPageDataMigration } from "../AvaPageDataMigrator";
import type {
  V4_AvaPageData,
  V5_AvaPageData,
  V5_PBlockPropsRegistry,
  V5_AvaPageRootProps,
} from "./AvaPageDataMigrationV5.types";

function _downgradeChart(
  props: V5_PBlockPropsRegistry["DataViz"],
): Record<string, unknown> {
  if (props.bindingVersion === 0) {
    const { bindingVersion: _version, ...legacy } = props;
    return legacy;
  }
  const {
    bindingVersion: _version,
    columnBindings,
    globalFilterTargets,
    ...rest
  } = props;
  Object.values(globalFilterTargets).forEach((target) => {
    if (
      target.kind === "bound" &&
      !columnBindings.columns.some((column) => {
        return column.id === target.columnId;
      })
    ) {
      throw new Error(
        "Cannot downgrade DataViz: a global filter has no persisted binding",
      );
    }
  });
  const resolved = resolveVizColumnBindings(
    props.vizConfig,
    columnBindings.columns,
  );
  if (resolved.issues.length) {
    throw new Error(
      "Cannot downgrade DataViz: a chart column has no persisted binding",
    );
  }
  const localFilters = props.localFilters.map(({ columnId, ...filter }) => {
    const column = columnBindings.columns.find((candidate) => {
      return candidate.id === columnId;
    });
    if (!column) {
      throw new Error(
        "Cannot downgrade DataViz: a local filter has no persisted binding",
      );
    }
    return { ...filter, columnName: column.name };
  });
  return { ...rest, vizConfig: resolved.config, localFilters };
}

/**
 * Structural v5 migration. Live schema resolution belongs to runtime ingress.
 */
export const AvaPageDataMigrationV5 = {
  downgradedVersion: 4,
  upgradedVersion: 5,
  upgrade: (data: V4_AvaPageData): V5_AvaPageData => {
    return transformAvaPageProps<V5_PBlockPropsRegistry, V5_AvaPageRootProps>(
      data as unknown as V5_AvaPageData,
      {
        root: (props) => {
          return { ...props, schemaVersion: 5 };
        },
        DataViz: (props) => {
          return {
            ...props,
            bindingVersion: 0,
          } as V5_PBlockPropsRegistry["DataViz"];
        },
      },
    ) as V5_AvaPageData;
  },
  downgrade: (data: V5_AvaPageData): V4_AvaPageData => {
    return transformAvaPageProps<V5_PBlockPropsRegistry, V5_AvaPageRootProps>(
      data,
      {
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
    ) as unknown as V4_AvaPageData;
  },
} satisfies AvaPageDataMigration<V4_AvaPageData, V5_AvaPageData>;
