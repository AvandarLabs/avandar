import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { LockupMarkShared } from "./LockupMarkShared/LockupMarkShared";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  exit: BrandLockupSceneProps["exit"];
};

/** The flight colour fading over a column as the flight covers the frame. */
export function MarkColumnCover({ frame, exit }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: LockupMarkShared.sceneColorFromName({
          tokens,
          name: exit?.color ?? "brand",
        }),
        opacity: BrandLockupMotion.getFlightProgress({ frame, exit, motion })
          .cover,
      }}
    />
  );
}
