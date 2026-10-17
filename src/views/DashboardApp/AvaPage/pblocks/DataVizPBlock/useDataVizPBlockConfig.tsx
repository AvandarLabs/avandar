import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { makeDataVizPBlockStateFromProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";
import { useGlobalFilterSubscriptionPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/useGlobalFilterSubscriptionPFieldConfig";
import { useLocalFiltersPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/useLocalFiltersPFieldConfig";
import { useNLQueryPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/useNLQueryPFieldConfig";
import { useVizConfigPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/useVizConfigPFieldConfig";
import { prepareDataVizBindings } from "../../utils/prepareDashboardBindings/prepareDashboardBindings";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizConfigMemory } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";
import type { Field, Fields } from "@puckeditor/core";
import type { RefObject } from "react";

const DEFAULT_VIZ_TYPE = "table" as const;

const defaultProps: DataVizPBlockProps = {
  bindingVersion: 1,
  columnBindings: { version: 1, scopeKey: "", sqlKey: "", columns: [] },
  globalFilterTargets: {},
  nlQuery: {
    prompt: "",
    rawSql: "",
    generations: [],
  },
  vizType: DEFAULT_VIZ_TYPE,
  vizConfig: VizConfigs.makeEmptyConfig(DEFAULT_VIZ_TYPE),
  globalFilterSubscription: DataVizFilters.defaultGlobalFilterSubscription,
  localFilters: [],
};

type DataVizPBlockConfigOptions = {
  resolveBindings: (
    props: DataVizPBlockProps & { id: string },
  ) => Promise<DataVizPBlockProps>;
  label: string;
  nlQueryField: Field<DataVizPBlockProps["nlQuery"]>;
  vizConfigField: Field<DataVizPBlockProps["vizConfig"]>;
  globalFilterField: Field<DataVizPBlockProps["globalFilterSubscription"]>;
  localFiltersField: Field<DataVizPBlockProps["localFilters"]>;
  vizTypeLabel: string;

  /** Stores per-block viz config memory across Puck data callbacks. */
  vizConfigMemoryRef: RefObject<DataVizConfigMemory>;
};

type UseDataVizPBlockConfigOptions = {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
  snapshotRevision?: string;
};

function _getDataVizPBlockConfig(
  options: Readonly<DataVizPBlockConfigOptions>,
): AvaPageConfig["components"]["DataViz"] {
  return {
    label: options.label,
    fields: {
      nlQuery: options.nlQueryField,
      vizType: {
        label: options.vizTypeLabel,
        type: "select",
        options: VizTypes.map((vizType) => {
          return {
            label: vizTypeLabel(vizType),
            value: vizType,
          };
        }),
      },
      vizConfig: options.vizConfigField,
      globalFilterSubscription: options.globalFilterField,
      localFilters: options.localFiltersField,
    } as Fields<DataVizPBlockProps>,
    defaultProps,
    resolveData: async (data, { changed, trigger }) => {
      const originalProps = data.props as DataVizPBlockProps;
      const { props, vizConfigMemory } = makeDataVizPBlockStateFromProps({
        props: originalProps,
        changed,
        trigger,
        blockId: data.props.id,
        vizConfigMemory: options.vizConfigMemoryRef.current,
      });

      options.vizConfigMemoryRef.current = vizConfigMemory;
      return {
        props:
          trigger === "load" ||
          props.bindingVersion === 0 ||
          !props.nlQuery.rawSql.trim()
            ? props
            : await options.resolveBindings({ ...props, id: data.props.id }),
      };
    },
    // Puck maps branded strings as objects. Runtime serialized IDs remain
    // strings.
    render:
      DataVizPBlock as unknown as AvaPageConfig["components"]["DataViz"]["render"],
  };
}

/**
 * Build the Puck component config for the dashboard's Data Visualization
 * block.
 *
 * Top-level fields are `nlQuery`, `vizType`, and `vizConfig`. `vizType` is a
 * regular Puck select so it appears as a first-class control alongside the
 * prompt; `vizConfig` is a custom field that renders the per-type subform
 * (axis pickers, legend toggle, etc.). The `resolveData` hook keeps the two
 * in sync by running `VizConfigs.convertVizConfig` whenever the user picks a
 * different `vizType`, and by falling back to defaults when older saved data
 * is missing either field.
 *
 * This is a React hook because it composes the per-field configs (which are
 * themselves hooks). It must be invoked from a React component / hook.
 */
export function useDataVizPBlockConfig(
  options: Readonly<UseDataVizPBlockConfigOptions>,
): AvaPageConfig["components"]["DataViz"] {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const auth = useMemo(() => {
    return options.workspaceId
      ? { auth: "workspace" as const, workspaceId: options.workspaceId }
      : {
          auth: "public" as const,
          publicAvaPageId: options.dashboardId,
          snapshotRevision: options.snapshotRevision ?? "",
        };
  }, [options.workspaceId, options.dashboardId, options.snapshotRevision]);

  const vizConfigMemoryRef = useRef<DataVizConfigMemory>({});
  const nlQueryFieldConfig = useNLQueryPFieldConfig();
  const vizConfigFieldConfig = useVizConfigPFieldConfig({
    workspaceId: options.workspaceId,
    dashboardId: options.dashboardId,
    snapshotRevision: options.snapshotRevision,
  });
  const globalFilterSubscriptionFieldConfig =
    useGlobalFilterSubscriptionPFieldConfig();
  const localFiltersFieldConfig = useLocalFiltersPFieldConfig(auth);

  return useMemo(() => {
    return _getDataVizPBlockConfig({
      resolveBindings: (props) => {
        return prepareDataVizBindings(props, auth, queryClient, []);
      },
      label: t`Data Visualization`,
      nlQueryField: nlQueryFieldConfig,
      vizConfigField: vizConfigFieldConfig,
      globalFilterField: globalFilterSubscriptionFieldConfig,
      localFiltersField: localFiltersFieldConfig,
      vizTypeLabel: t`Visualization Type`,
      vizConfigMemoryRef,
    });
  }, [
    t,
    auth,
    queryClient,
    nlQueryFieldConfig,
    vizConfigFieldConfig,
    globalFilterSubscriptionFieldConfig,
    localFiltersFieldConfig,
  ]);
}
