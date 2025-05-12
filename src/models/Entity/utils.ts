import { LinkProps } from "@tanstack/react-router";
import { EntityConfig, EntityConfigId } from "../EntityConfig/types";
import { Entity, EntityId } from "./types";

export function getEntityLinkProps(config: {
  entityConfig: EntityConfigId | EntityConfig;
  entity: EntityId | Entity;
}): Pick<LinkProps, "to" | "params"> {
  const { entityConfig, entity } = config;
  return {
    to: "/entity-manager/$entityConfigId/$entityId",
    params: {
      entityId: typeof entity === "string" ? entity : entity.id,
      entityConfigId:
        typeof entityConfig === "string" ? entityConfig : entityConfig.id,
    },
  };
}
