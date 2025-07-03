import { AppLink } from "@/config/AppLinks";
import { EntityConfig, EntityConfigId } from "./types";

export function getEntityConfigLinkProps({
  workspaceSlug,
  entityConfig,
}: {
  workspaceSlug: string;
  entityConfig: EntityConfig | EntityConfigId;
}): AppLink {
  const entityConfigId =
    typeof entityConfig === "string" ? entityConfig : entityConfig.id;
  return {
    key: `entity-config-${entityConfigId}`,
    to: "/$workspaceSlug/entity-designer/$entityConfigId",
    params: {
      workspaceSlug,
      entityConfigId,
    },
    label: "Entity Config",
  };
}
