import { uuidType } from "$/lib/zodHelpers";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { Workspace } from "$/models/Workspace/Workspace";
import { useMemo } from "react";
import z from "zod";
import type { PuckContext } from "@puckeditor/core";

export type AvaPageMetadata = {
  dashboardId: Dashboard.Id;
} & (
  | {
      auth: "public";
      workspaceId?: undefined;
    }
  | {
      auth: "workspace";
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
      }),
      z.object({
        auth: z.literal("workspace"),
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
