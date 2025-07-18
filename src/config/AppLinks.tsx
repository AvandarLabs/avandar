import { Key } from "react";
import { LinkProps } from "@/lib/ui/links/Link";

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
  label: string;
};

type AppLinksRecord = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppLink | ((params: any) => AppLink)
>;

export const AppLinks = {
  // Root-level links
  home: { key: "home", to: "/", label: "Home" },
  signin: { key: "signin", to: "/signin", label: "Sign in" },
  invalidWorkspace: {
    key: "invalid-workspace",
    to: "/invalid-workspace",
    label: "Invalid workspace",
  },
  updatePassword: {
    key: "update-password",
    to: "/update-password",
    label: "Update password",
  },

  // Workspace root link
  workspaceHome: (workspaceSlug: string) => {
    return {
      key: "workspace-home",
      to: "/$workspaceSlug",
      params: { workspaceSlug },
      label: "Workspace Home",
    };
  },

  // Profile links
  profile: (workspaceSlug: string) => {
    return {
      key: "profile",
      to: "/$workspaceSlug/profile",
      params: { workspaceSlug },
      label: "Profile",
    };
  },

  // Data Manager links
  dataManagerHome: (workspaceSlug: string) => {
    return {
      key: "data-manager",
      to: "/$workspaceSlug/data-manager",
      params: { workspaceSlug },
      label: "Data Manager",
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
      label: datasetName,
    };
  },
  dataImport: (workspaceSlug: string) => {
    return {
      key: "dataImport",
      to: "/$workspaceSlug/data-manager/data-import",
      params: {
        workspaceSlug: workspaceSlug,
      },
      label: "Import data",
    };
  },

  // Data Explorer links
  dataExplorer: (workspaceSlug: string) => {
    return {
      key: "data-explorer",
      to: "/$workspaceSlug/data-explorer",
      params: { workspaceSlug },
      label: "Data Explorer",
    };
  },

  // Entity Designer links
  entityDesignerHome: (workspaceSlug: string) => {
    return {
      key: "entity-designer",
      to: "/$workspaceSlug/entity-designer",
      params: { workspaceSlug },
      label: "Profile Designer",
    };
  },
  entityDesignerConfigView: ({
    workspaceSlug,
    entityConfigId,
    entityConfigName,
  }: {
    workspaceSlug: string;
    entityConfigId: string;
    entityConfigName: string;
  }) => {
    return {
      key: `entity-config-${entityConfigId}`,
      to: "/$workspaceSlug/entity-designer/$entityConfigId",
      params: {
        workspaceSlug,
        entityConfigId,
      },
      label: entityConfigName,
    };
  },
  entityDesignerCreatorView: (workspaceSlug: string) => {
    return {
      key: "entity-creator",
      to: "/$workspaceSlug/entity-designer/entity-creator",
      params: { workspaceSlug },
      label: "Create new entity",
    };
  },

  // Entity Manager links
  entityManagerHome: ({
    workspaceSlug,
    entityConfigId,
    entityConfigName,
  }: {
    workspaceSlug: string;
    entityConfigId: string;
    entityConfigName: string;
  }) => {
    return {
      key: `entity-manager-${entityConfigId}`,
      to: "/$workspaceSlug/entity-manager/$entityConfigId",
      params: {
        workspaceSlug,
        entityConfigId,
      },
      label: entityConfigName,
    };
  },
  entityManagerEntityView: ({
    workspaceSlug,
    entityConfigId,
    entityId,
    entityName,
  }: {
    workspaceSlug: string;
    entityConfigId: string;
    entityId: string;
    entityName: string;
  }) => {
    return {
      key: `entity-manager-${entityConfigId}-${entityId}`,
      to: "/$workspaceSlug/entity-manager/$entityConfigId/$entityId",
      params: {
        workspaceSlug,
        entityConfigId,
        entityId,
      },
      label: entityName,
    };
  },
  // Settings link
  workspaceSettings: (workspaceSlug: string) => {
    return {
      key: "workspace-settings",
      to: "/$workspaceSlug/settings",
      params: { workspaceSlug },
      label: "Settings",
    };
  },
} as const satisfies AppLinksRecord;

export type AppLinkKey = keyof typeof AppLinks;
