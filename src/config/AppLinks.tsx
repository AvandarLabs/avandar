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
  home: { key: "home", to: "/", label: "Home" },
  signin: { key: "signin", to: "/signin", label: "Sign in" },
  invalidWorkspace: {
    key: "invalid-workspace",
    to: "/invalid-workspace",
    label: "Invalid workspace",
  },

  profile: (workspaceSlug: string) => {
    return {
      key: "profile",
      to: "/$workspaceSlug/profile",
      params: { workspaceSlug },
      label: "Profile",
    };
  },
  dataManager: (workspaceSlug: string) => {
    return {
      key: "data-manager",
      to: "/$workspaceSlug/data-manager",
      params: { workspaceSlug },
      label: "Data Manager",
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
  dataExplorer: (workspaceSlug: string) => {
    return {
      key: "data-explorer",
      to: "/$workspaceSlug/data-explorer",
      params: { workspaceSlug },
      label: "Data Explorer",
    };
  },
  entityDesigner: (workspaceSlug: string) => {
    return {
      key: "entity-designer",
      to: "/$workspaceSlug/entity-designer",
      params: { workspaceSlug },
      label: "Profile Designer",
    };
  },
  entityCreator: (workspaceSlug: string) => {
    return {
      key: "entity-creator",
      to: "/$workspaceSlug/entity-designer/entity-creator",
      params: { workspaceSlug },
      label: "Create new entity",
    };
  },
  entityManager: ({
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
} as const satisfies AppLinksRecord;

export type AppLinkKey = keyof typeof AppLinks;
