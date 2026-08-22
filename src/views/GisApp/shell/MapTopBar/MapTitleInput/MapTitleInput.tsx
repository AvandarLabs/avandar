import type { ReactNode } from "react";

import { MapTitleEditor } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleEditor";

type Props = {
  name: string;
  onNameChange: (name: string) => void;
};

/** Edits the map name locally and commits a nonblank draft on blur or Enter. */
export function MapTitleInput({ name, onNameChange }: Props): ReactNode {
  return <MapTitleEditor key={name} name={name} onNameChange={onNameChange} />;
}
