import { LinkProps } from "@/lib/ui/links/Link";
import { EntityConfig, EntityConfigId } from "./types";

export function getEntityConfigLinkProps(
  entityConfig: EntityConfig | EntityConfigId,
): Pick<LinkProps, "to" | "params"> {
  return {
    to: "/entity-designer/$entityConfigId",
    params: {
      entityConfigId:
        typeof entityConfig === "string" ? entityConfig : entityConfig.id,
    },
  };
}

export function getEntityManagerLinkProps(
  entityConfig: EntityConfig | EntityConfigId,
): Pick<LinkProps, "to" | "params"> {
  return {
    to: "/entity-manager/$entityConfigId",
    params: {
      entityConfigId:
        typeof entityConfig === "string" ? entityConfig : entityConfig.id,
    },
  };
}
