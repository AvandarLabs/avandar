import { useMemo } from "react";
import z from "zod";
import { uuidType } from "$/lib/zodHelpers";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { Workspace } from "$/models/Workspace/Workspace";
import type { PuckContext } from "@puckeditor/core";

/** Where a page's dashboard data comes from. */
export type AvaPageMetadata = {
  dashboardId: Dashboard.Id;
} & (
  | {
      auth: "public";
      snapshotRevision: string;
      workspaceId?: undefined;
    }
  | {
      auth: "workspace";
      workspaceId: Workspace.Id;
    }
  | {
      auth: "workspace_published";
      snapshotRevision: string;
      workspaceId: Workspace.Id;
    }
);

const AvaPageMetadataSchema = z
  .object({
    dashboardId: uuidType<Dashboard.Id>(),
  })
  .and(
    z.discriminatedUnion("auth", [
      z.object({
        auth: z.literal("public"),
        snapshotRevision: z.string(),
      }),
      z.object({
        auth: z.literal("workspace"),
        workspaceId: uuidType<Workspace.Id>(),
      }),
      z.object({
        auth: z.literal("workspace_published"),
        snapshotRevision: z.string(),
        workspaceId: uuidType<Workspace.Id>(),
      }),
    ]),
  );

export function useAvaPageMetadata(puckContext: PuckContext): AvaPageMetadata {
  const { metadata } = puckContext;
  const parsedMetadata = useMemo(() => {
    return AvaPageMetadataSchema.parse(metadata);
  }, [metadata]);
  return parsedMetadata;
}
