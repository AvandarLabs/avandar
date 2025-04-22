import { LinkProps } from "@/lib/ui/links/Link";
import { EntityConfig } from "./EntityConfig.types";

export function getEntityConfigLinkProps(
  entity: EntityConfig,
): Pick<LinkProps, "to" | "params"> {
  return {
    to: "/entity-designer/$entityConfigId",
    params: {
      entityConfigId: entity.id,
    },
  };
}
