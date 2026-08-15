import { useEffect, useState } from "react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type Draft = {
  kind: AvaMapConfig.CustomBasemapKind;
  url: string;
  attribution: string;
  onKindChange: (kind: AvaMapConfig.CustomBasemapKind) => void;
  onUrlChange: (url: string) => void;
  onAttributionChange: (attribution: string) => void;
};

/** Keeps the custom-basemap draft synchronized when the modal opens. */
export function useCustomBasemapDraft(
  opened: boolean,
  basemap: AvaMapConfig.Basemap,
): Draft {
  const [kind, setKind] = useState<AvaMapConfig.CustomBasemapKind>("xyz");
  const [url, setUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  useEffect(
    function adoptCurrentBasemapOnOpen() {
      if (!opened) {
        return;
      }
      const current = basemap.type === "custom" ? basemap : undefined;
      setKind(current?.kind ?? "xyz");
      setUrl(current?.url ?? "");
      setAttribution(current?.attribution ?? "");
    },
    [basemap, opened],
  );
  return {
    kind,
    url,
    attribution,
    onKindChange: setKind,
    onUrlChange: setUrl,
    onAttributionChange: setAttribution,
  };
}
