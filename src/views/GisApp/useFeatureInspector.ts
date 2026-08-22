import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";

import { useDisclosure } from "@mantine/hooks";
import { useCallback, useState } from "react";

type FeatureInspectorState = {
  selectedFeature: GeoJSON.Feature | undefined;
  selectedCluster: ClusterSelection | undefined;
  isInspectorOpen: boolean;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  onClusterClick: (cluster: ClusterSelection) => void;
  onRowClick: (feature: GeoJSON.Feature) => void;
  onBackToTable: () => void;
  closeInspector: () => void;
};

/**
 * Holds the drawer's open state and which of a single feature or a
 * cluster's feature table it shows.
 *
 * `selectedCluster` stays set while a feature drilled into from its table
 * is shown, so {@link onBackToTable} can clear just the feature and return
 * to the table. A feature clicked directly (no cluster involved) clears
 * `selectedCluster`, so no back control appears for it.
 */
export function useFeatureInspector(): FeatureInspectorState {
  const [selectedFeature, setSelectedFeature] = useState<
    GeoJSON.Feature | undefined
  >(undefined);
  const [selectedCluster, setSelectedCluster] = useState<
    ClusterSelection | undefined
  >(undefined);
  const [isInspectorOpen, { open, close }] = useDisclosure(false);

  const onFeatureClick = useCallback(
    (feature: GeoJSON.Feature) => {
      setSelectedFeature(feature);
      setSelectedCluster(undefined);
      open();
    },
    [open],
  );

  const onClusterClick = useCallback(
    (cluster: ClusterSelection) => {
      setSelectedCluster(cluster);
      setSelectedFeature(undefined);
      open();
    },
    [open],
  );

  const onRowClick = useCallback((feature: GeoJSON.Feature) => {
    setSelectedFeature(feature);
  }, []);

  const onBackToTable = useCallback(() => {
    setSelectedFeature(undefined);
  }, []);

  const closeInspector = useCallback(() => {
    close();
    setSelectedFeature(undefined);
    setSelectedCluster(undefined);
  }, [close]);

  return {
    selectedFeature,
    selectedCluster,
    isInspectorOpen,
    onFeatureClick,
    onClusterClick,
    onRowClick,
    onBackToTable,
    closeInspector,
  };
}
