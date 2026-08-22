import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { Loader } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react";

type Props = {
  status: MapLayerViewState["status"];
  hasPartialMapping: boolean;
};

/** Renders the icon for the selected layer's status. */
export function MapStatusIcon({ status, hasPartialMapping }: Props): ReactNode {
  const informationIcon = (): ReactNode => {
    return hasPartialMapping ? (
      <IconAlertTriangle size={15} stroke={1.8} />
    ) : (
      <IconInfoCircle size={15} stroke={1.8} />
    );
  };
  return matchLiteral(status, {
    unbound: informationIcon,
    loading: () => {
      return <Loader size={14} />;
    },
    error: () => {
      return <IconCircleX size={15} stroke={1.8} />;
    },
    empty: informationIcon,
    ready: informationIcon,
  });
}
