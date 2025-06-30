import { IconBook } from "@tabler/icons-react";
import { AppShell } from "@/lib/ui/AppShell";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { getEntityManagerLinkProps } from "@/models/EntityConfig/utils";
import { useSpotlightActions } from "./useSpotlightActions";

export function AppScaffold(): JSX.Element {
  const spotlightActions = useSpotlightActions();
  const [entityConfigs] = EntityConfigClient.useGetAll();

  const entityManagerLinks = (entityConfigs ?? []).map((entityConfig) => {
    return {
      key: entityConfig.id,
      label: entityConfig.name,
      icon: () => {
        return <IconBook size={24} stroke={1.5} />;
      },
      ...getEntityManagerLinkProps(entityConfig),
    };
  });

  return (
    <AppShell
      headerHeight={60}
      footerHeight={60}
      asideWidth={300}
      navbarWidth={220}
      additionalLinks={entityManagerLinks}
      additionalSpotlightActions={spotlightActions}
    />
  );
}
