import { useDisclosure } from "@mantine/hooks";
import { useCallback, useState } from "react";

type FeatureInspector = {
  selectedFeature: GeoJSON.Feature | undefined;
  isInspectorOpen: boolean;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  closeInspector: () => void;
};

/** Holds the selected feature and the inspector's open state. */
export function useFeatureInspector(): FeatureInspector {
  const [selectedFeature, setSelectedFeature] = useState<
    GeoJSON.Feature | undefined
  >(undefined);
  const [isInspectorOpen, { open, close }] = useDisclosure(false);
  const onFeatureClick = useCallback(
    (feature: GeoJSON.Feature) => {
      setSelectedFeature(feature);
      open();
    },
    [open],
  );
  const closeInspector = useCallback(() => {
    close();
    setSelectedFeature(undefined);
  }, [close]);
  return {
    selectedFeature,
    isInspectorOpen,
    onFeatureClick,
    closeInspector,
  };
}
