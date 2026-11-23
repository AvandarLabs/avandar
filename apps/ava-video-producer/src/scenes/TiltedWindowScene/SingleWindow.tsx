import { PrimaryWindow } from "./PrimaryWindow/PrimaryWindow";
import { SecondaryWindow } from "./SecondaryWindow";
import type { SizedProps as Props } from "./TiltedWindowSceneShared/TiltedWindowSceneShared.types";
import type { ReactNode } from "react";

/** Draws the primary window and its optional secondary window. */
export function SingleWindow({
  secondary,
  ...windowProps
}: Readonly<Props>): ReactNode {
  return (
    <>
      <PrimaryWindow {...windowProps} />
      {secondary ? (
        <SecondaryWindow {...windowProps} secondary={secondary} />
      ) : undefined}
    </>
  );
}
