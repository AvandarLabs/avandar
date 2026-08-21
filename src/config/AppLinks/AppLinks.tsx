import { t } from "@lingui/core/macro";
import { Key } from "react";
import type { LinkProps } from "@avandar/ui";

/**
 * Configuration for a navigable link in the app.
 * These show up in the navbar.
 */
export type AppLink<
  To extends LinkProps["to"] = LinkProps["to"],
  Params extends LinkProps["params"] = LinkProps["params"],
> = {
  /** A unique React key to use in case we render in a list*/
  key: Key;
  to: NonNullable<To>;
  params?: Params;
  label: () => string;
  /**
   * Whether this destination is usable when the browser is offline.
   * Drive `<OfflineGated>` and similar offline-aware UI from this flag.
   * Read-only views backed by the persisted React Query cache or local
   * Dexie data are `true`; anything that needs a live Supabase / Postgres
   * round-trip is `false`. Default `false` (safe).
   */
  isAvailableOffline: boolean;
};

type AppLinksRecord = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppLink | ((params: any) => AppLink)
>;

export const AppLinks = {
  // Root-level links
  home: {
    key: "home",
    to: "/",
    label: (): string => {
      return t`Home`;
    },
    isAvailableOffline: false,
  },
  signin: {
    key: "signin",
    to: "/signin",
    label: (): string => {
      return t`Sign in`;
    },
    isAvailableOffline: false,
  },
  invalidWorkspace: {
    key: "invalid-workspace",
    to: "/invalid-workspace",
    label: (): string => {
      return t`Invalid workspace`;
    },
    isAvailableOffline: false,
  },
  updatePassword: {
    key: "update-password",
    to: "/update-password",
    label: (): string => {
      return t`Update password`;
    },
    isAvailableOffline: false,
  },

  // Workspace root link
  workspaceHome: (workspaceSlug: string) => {
    return {
      key: "workspace-home",
      to: "/$workspaceSlug",
      params: { workspaceSlug },
      label: (): string => {
        return t`Home`;
      },
      isAvailableOffline: true,
    };
  },

  // Profile links
  profile: (workspaceSlug: string) => {
    return {
      key: "profile",
      to: "/$workspaceSlug/profile",
      params: { workspaceSlug },
      label: (): string => {
        return t`Profile`;
      },
      isAvailableOffline: false,
    };
  },

  // Data Manager links
  dataManagerHome: (workspaceSlug: string) => {
    return {
      key: "data-manager",
      to: "/$workspaceSlug/data-manager",
      params: { workspaceSlug },
      label: (): string => {
        return t`Data Sources`;
      },
      isAvailableOffline: true,
    };
  },
  dataManagerDatasetView: ({
    workspaceSlug,
    datasetId,
    datasetName,
  }: {
    workspaceSlug: string;
    datasetId: string;
    datasetName: string;
  }) => {
    return {
      key: "data-manager-dataset-view",
      to: "/$workspaceSlug/data-manager/$datasetId",
      params: {
        workspaceSlug,
        datasetId,
      },
      label: () => {
        return datasetName;
      },
      isAvailableOffline: true,
    };
  },
  dataImport: (workspaceSlug: string) => {
    return {
      key: "dataImport",
      to: "/$workspaceSlug/data-manager/data-import",
      params: {
        workspaceSlug: workspaceSlug,
      },
      label: (): string => {
        return t`Import data`;
      },
      isAvailableOffline: true,
    };
  },

  // Data Explorer links
  dataExplorer: (workspaceSlug: string) => {
    return {
      key: "data-explorer",
      to: "/$workspaceSlug/data-explorer",
      params: { workspaceSlug },
      label: (): string => {
        return t`Data Explorer`;
      },
      isAvailableOffline: true,
    };
  },

  // Dashboards links
  dashboards: (workspaceSlug: string) => {
    return {
      key: "dashboards",
      to: "/$workspaceSlug/dashboards",
      params: { workspaceSlug },
      label: (): string => {
        return t`Dashboards`;
      },
      isAvailableOffline: true,
    };
  },

  // Map links
  map: (workspaceSlug: string) => {
    return {
      key: "map",
      to: "/$workspaceSlug/map",
      params: { workspaceSlug },
      label: (): string => {
        return t`Maps`;
      },
      isAvailableOffline: false,
    };
  },
  /** Builds the route for editing one map in a workspace. */
  mapEditor: ({
    workspaceSlug,
    mapId,
  }: {
    workspaceSlug: string;
    mapId: string;
  }) => {
    return {
      key: "mapEditor",
      to: "/$workspaceSlug/map/$mapId",
      params: { workspaceSlug, mapId },
      label: (): string => {
        return t`Map`;
      },
      isAvailableOffline: false,
    };
  },

  // Ontology Designer links
  ontologyDesignerHome: (workspaceSlug: string) => {
    return {
      key: "ontology-designer",
      to: "/$workspaceSlug/ontology-designer",
      params: { workspaceSlug },
      label: (): string => {
        return t`Case Manager`;
      },
      isAvailableOffline: false,
    };
  },
  ontologyDesignerConceptView: ({
    workspaceSlug,
    conceptId,
    conceptName,
  }: {
    workspaceSlug: string;
    conceptId: string;
    conceptName: string;
  }) => {
    return {
      key: `concept-${conceptId}`,
      to: "/$workspaceSlug/ontology-designer/$conceptId",
      params: {
        workspaceSlug,
        conceptId,
      },
      label: () => {
        return conceptName;
      },
      isAvailableOffline: false,
    };
  },
  ontologyDesignerCreatorView: (workspaceSlug: string) => {
    return {
      key: "concept-creator",
      to: "/$workspaceSlug/ontology-designer/concept-creator",
      params: { workspaceSlug },
      label: (): string => {
        return t`New case type`;
      },
      isAvailableOffline: false,
    };
  },

  // Individual Manager links
  individualManagerHome: ({
    workspaceSlug,
    conceptId,
    conceptName,
  }: {
    workspaceSlug: string;
    conceptId: string;
    conceptName: string;
  }) => {
    return {
      key: `individual-manager-${conceptId}`,
      to: "/$workspaceSlug/individual-manager/$conceptId",
      params: {
        workspaceSlug,
        conceptId,
      },
      label: () => {
        return conceptName;
      },
      isAvailableOffline: false,
    };
  },
  individualManagerIndividualView: ({
    workspaceSlug,
    conceptId,
    individualId,
    individualName,
  }: {
    workspaceSlug: string;
    conceptId: string;
    individualId: string;
    individualName: string;
  }) => {
    return {
      key: `individual-manager-${conceptId}-${individualId}`,
      to: "/$workspaceSlug/individual-manager/$conceptId/$individualId",
      params: {
        workspaceSlug,
        conceptId,
        individualId,
      },
      label: () => {
        return individualName;
      },
      isAvailableOffline: false,
    };
  },

  // Settings link
  workspaceSettings: (workspaceSlug: string) => {
    return {
      key: "workspace-settings",
      to: "/$workspaceSlug/settings",
      params: { workspaceSlug },
      label: (): string => {
        return t`Settings`;
      },
      isAvailableOffline: true,
    };
  },
} as const satisfies AppLinksRecord;

export type AppLinkKey = keyof typeof AppLinks;
