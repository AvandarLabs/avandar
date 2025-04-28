import { LinkProps } from "@/lib/ui/links/Link";
import { EntityConfig, EntityConfigId } from "./types";

export function getEntityConfigLinkProps(
  entity: EntityConfig | EntityConfigId,
): Pick<LinkProps, "to" | "params"> {
  return {
    to: "/entity-designer/$entityConfigId",
    params: {
      entityConfigId: typeof entity === "string" ? entity : entity.id,
    },
  };
}
